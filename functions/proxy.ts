// Inspired by https://raw.githubusercontent.com/Zibri/cloudflare-cors-anywhere/refs/heads/master/index.js

import type {EventContext} from '@cloudflare/workers-types';
import * as Sentry from '@sentry/cloudflare';

type CustomHeaders = Record<string, string>;

interface CloudflareRequestCF {
	country?: string;
	colo?: string;
}

interface ProxyConfig {
	allowListOrigins: string[];
	denyListUrls: string[];
	allowListUrls: string[];
}

const config: ProxyConfig = {
	denyListUrls: [],
	allowListUrls: [
		'https://cdn\\.factoriobin\\.com/.*',
		'https://factoriobin\\.com/post/.*',
		'https://factorio\\.school/api/blueprint/.*',
		'https://ny\\.storage\\.bunnycdn\\.com/factorio-blueprints/blueprints/by-sha1/.*',
		'https://ny\\.storage\\.bunnycdn\\.com/factorio-blueprints/blueprints/by-key/.*/.*',
		'https://ny\\.storage\\.bunnycdn\\.com/factorio-blueprints/blueprints/by-key/.*',
	],
	allowListOrigins: ['http://localhost.*', 'https://factorio-blueprint-playground.pages.dev.*'],
};

function isListedIn(uri: string | null, listing: string[]): boolean {
	if (!uri) return true;
	return listing.some((pattern) => new RegExp(pattern).test(uri));
}

function setupCORSHeaders(
	headers: Headers,
	originHeader: string | null,
	isPreflightRequest: boolean,
	requestHeaders?: string,
): Headers {
	headers.set('Access-Control-Allow-Origin', originHeader || '*');

	if (isPreflightRequest) {
		headers.set('Access-Control-Allow-Methods', '*');
		if (requestHeaders) {
			headers.set('Access-Control-Allow-Headers', requestHeaders);
		}
		headers.delete('X-Content-Type-Options');
	}

	return headers;
}

interface Env {
	KV: KVNamespace;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

const wrappedOnRequest = async (context: EventContext<Env, string, Record<string, unknown>>) => {
	const request = context.request;
	const isPreflightRequest = request.method === 'OPTIONS';
	const originUrl = new URL(request.url);
	const targetUrl = decodeURIComponent(decodeURIComponent(originUrl.search.substr(1)));
	const originHeader = request.headers.get('Origin');
	const connectingIp = request.headers.get('CF-Connecting-IP');

	if (
		isListedIn(targetUrl, config.denyListUrls) ||
		!isListedIn(targetUrl, config.allowListUrls) ||
		!isListedIn(originHeader, config.allowListOrigins)
	) {
		return new Response(
			'Access denied. Create your own CORS proxy at ' + 'https://github.com/Zibri/cloudflare-cors-anywhere',
			{
				status: 403,
				headers: {'Content-Type': 'text/plain'},
			},
		);
	}

	let customHeaders: CustomHeaders | null = null;
	const corsHeadersStr = request.headers.get('x-cors-headers');

	if (corsHeadersStr) {
		try {
			customHeaders = JSON.parse(corsHeadersStr) as CustomHeaders;
		} catch {
			// Invalid JSON in custom headers - ignore
		}
	}

	// Handle actual request with URL
	if (originUrl.search.startsWith('?')) {
		// Filter and prepare headers
		const filteredHeaders: Record<string, string> = {};
		for (const [key, value] of [...request.headers]) {
			if (!/^(origin|eferer|^cf-|^x-forw|^x-cors-headers)/.test(key)) {
				filteredHeaders[key] = value;
			}
		}

		if (customHeaders) {
			Object.assign(filteredHeaders, customHeaders);
		}

		try {
			// Forward the request
			const response = await fetch(targetUrl, {
				method: request.method,
				headers: filteredHeaders,
				redirect: 'follow',
				body: isPreflightRequest ? null : (request.body as BodyInit),
			});

			const responseHeaders = new Headers(response.headers);
			const exposedHeaders: string[] = [];
			const allResponseHeaders: Record<string, string> = {};

			for (const [key, value] of [...response.headers]) {
				exposedHeaders.push(key);
				allResponseHeaders[key] = value;
			}

			exposedHeaders.push('cors-received-headers');
			setupCORSHeaders(
				responseHeaders,
				originHeader,
				isPreflightRequest,
				request.headers.get('access-control-request-headers') || undefined,
			);

			responseHeaders.set('Access-Control-Expose-Headers', exposedHeaders.join(','));
			responseHeaders.set('cors-received-headers', JSON.stringify(allResponseHeaders));

			const responseBody = response.status === 304 || isPreflightRequest ? null : await response.arrayBuffer();
			return new Response(responseBody, {
				headers: responseHeaders,
				status: isPreflightRequest ? 200 : response.status,
				statusText: isPreflightRequest ? 'OK' : response.statusText,
			});
		} catch (error) {
			Sentry.withScope((scope) => {
				scope.setTags({
					function: 'proxy',
					targetUrl,
					origin: originHeader,
				});
				scope.setExtras({
					userAgent: request.headers.get('User-Agent'),
					cfRay: request.headers.get('CF-Ray'),
					connectingIp,
				});
				Sentry.captureException(error);
			});
			return new Response('Error fetching resource', {status: 500});
		}
	}

	// Handle informational request (no URL provided)
	const responseHeaders = setupCORSHeaders(new Headers(), originHeader, isPreflightRequest);
	const cf = request.cf as CloudflareRequestCF | undefined;

	return new Response(
		'CLOUDFLARE-CORS-ANYWHERE\n\n' +
			'Source: https://github.com/Zibri/cloudflare-cors-anywhere\n\n' +
			`Usage: ${originUrl.origin}/?uri\n\n` +
			'Limits: 100,000 requests/day\n' +
			'        1,000 requests/10 minutes\n\n' +
			`${originHeader ? `Origin: ${originHeader}\n` : ''}` +
			`IP: ${connectingIp}\n` +
			`${cf?.country ? `Country: ${cf.country}\n` : ''}` +
			`${cf?.colo ? `Datacenter: ${cf.colo}\n` : ''}` +
			`${customHeaders ? `\nx-cors-headers: ${JSON.stringify(customHeaders)}` : ''}`,
		{
			status: 200,
			headers: responseHeaders,
		},
	);
};

export const onRequest = Sentry.sentryPagesPlugin(
	(context: EventContext<Env>) => ({
		dsn: context.env.SENTRY_DSN,
		environment: context.env.ENVIRONMENT || 'production',
		tracesSampleRate: 1.0,
	}),
	wrappedOnRequest,
);
