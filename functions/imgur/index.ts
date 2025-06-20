import type {EventContext} from '@cloudflare/workers-types';
import * as Sentry from '@sentry/cloudflare';
import {resolveImgurImage} from './api-client';
import {createJsonResponse, createRequestHandlers} from './http-helpers';
import {parseImgurUrl} from './url-parser';

interface Env {
	IMGUR_CLIENT_ID: string;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

async function parseRequestBody(request: Request): Promise<{url: string} | null> {
	try {
		return (await request.json()) as {url: string};
	} catch {
		return null;
	}
}

async function handleRequest(context: EventContext<Env, string, Record<string, unknown>>) {
	const {request, env} = context;
	const originHeader = request.headers.get('Origin');

	const handlers = createRequestHandlers(originHeader);

	if (request.method === 'OPTIONS') {
		return handlers.handleCorsPreflightRequest();
	}

	if (request.method !== 'POST') {
		return handlers.handleInvalidMethod();
	}

	if (!env.IMGUR_CLIENT_ID) {
		return handlers.handleMissingConfiguration();
	}

	try {
		const body = await parseRequestBody(request);

		if (!body || !body.url) {
			return handlers.handleMissingUrl();
		}

		const parseResult = parseImgurUrl(body.url);
		if (!parseResult.success) {
			return createJsonResponse(parseResult, 400, originHeader);
		}

		const resolveResult = await resolveImgurImage(parseResult.data!, env.IMGUR_CLIENT_ID, Sentry);
		const status = resolveResult.success ? 200 : 400;

		return createJsonResponse(resolveResult, status, originHeader);
	} catch (error) {
		Sentry.withScope((scope) => {
			scope.setTags({
				function: 'imgur-resolver',
				stage: 'request-parsing',
			});
			scope.setExtras({
				userAgent: request.headers.get('User-Agent'),
				cfRay: request.headers.get('CF-Ray'),
				origin: originHeader,
			});
			Sentry.captureException(error);
		});

		return createJsonResponse({success: false, error: 'Invalid request body'}, 400, originHeader);
	}
}

export const onRequest = Sentry.sentryPagesPlugin(
	(context) => ({
		dsn: context.env.SENTRY_DSN,
		environment: context.env.ENVIRONMENT || 'production',
		tracesSampleRate: 1.0,
	}),
	handleRequest,
);
