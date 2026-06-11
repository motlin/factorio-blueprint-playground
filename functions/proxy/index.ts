import type {EventContext} from '@cloudflare/workers-types';

const FILTERED_HEADERS_REGEX = /^(origin|eferer|^cf-|^x-forw|^x-cors-headers)/;

type CustomHeaders = Record<string, string>;

function parseCustomHeaders(raw: string): CustomHeaders | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return null;
	}

	const result: CustomHeaders = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (typeof value === 'string') {
			result[key] = value;
		}
	}
	return result;
}

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
	allowListOrigins: [
		'http://localhost.*',
		'https://factorio-blueprint-playground.pages.dev.*',
		'https://.*\\.factorio-blueprint-playground.pages.dev.*',
		'https://.*\\.factorio-prints.pages.dev.*',
		'https://factorioprints.com.*',
	],
};

function isListedIn(uri: string | null, listing: string[]): boolean {
	if (uri == null || uri.length === 0) return true;
	return listing.some((pattern) => new RegExp(pattern).test(uri));
}

function setupCORSHeaders(
	headers: Headers,
	originHeader: string | null,
	isPreflightRequest: boolean,
	requestHeaders?: string,
): Headers {
	headers.set('Access-Control-Allow-Origin', originHeader != null && originHeader.length > 0 ? originHeader : '*');

	if (isPreflightRequest) {
		headers.set('Access-Control-Allow-Methods', '*');
		if (requestHeaders != null && requestHeaders.length > 0) {
			headers.set('Access-Control-Allow-Headers', requestHeaders);
		}
		headers.delete('X-Content-Type-Options');
	}

	return headers;
}

interface Env {
	KV: KVNamespace;
	ENVIRONMENT?: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This is a proxy request handler with inherent complexity from multiple branching conditions
const wrappedOnRequest = async (context: EventContext<Env, string, Record<string, unknown>>) => {
	const request = context.request;
	const isPreflightRequest = request.method === 'OPTIONS';
	const originUrl = new URL(request.url);
	const targetUrl = decodeURIComponent(decodeURIComponent(originUrl.search.slice(1)));
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

	if (corsHeadersStr != null && corsHeadersStr.length > 0) {
		customHeaders = parseCustomHeaders(corsHeadersStr);
	}

	if (originUrl.search.startsWith('?')) {
		const filteredHeaders: Record<string, string> = {};
		for (const [key, value] of [...request.headers]) {
			if (!FILTERED_HEADERS_REGEX.test(key)) {
				filteredHeaders[key] = value;
			}
		}

		if (customHeaders) {
			Object.assign(filteredHeaders, customHeaders);
		}

		try {
			// The Cloudflare workers-types `ReadableStream` and the lib.dom `ReadableStream` are
			// nominally distinct even though they are identical at runtime; the worker fetch accepts
			// the request body stream directly. Cast bridges that lib mismatch.
			// oxlint-disable-next-line no-unsafe-type-assertion -- cross-lib ReadableStream identity mismatch (workers-types vs dom)
			const requestBody = (isPreflightRequest ? null : request.body) as BodyInit | null;
			const response = await fetch(targetUrl, {
				method: request.method,
				headers: filteredHeaders,
				redirect: 'follow',
				body: requestBody,
			});

			const responseHeaders = new Headers(response.headers);
			const exposedHeaders: string[] = [];
			const allResponseHeaders: Record<string, string> = {};

			for (const [key, value] of [...response.headers]) {
				exposedHeaders.push(key);
				allResponseHeaders[key] = value;
			}

			exposedHeaders.push('cors-received-headers');
			const requestHeaders = request.headers.get('access-control-request-headers');
			setupCORSHeaders(
				responseHeaders,
				originHeader,
				isPreflightRequest,
				requestHeaders != null && requestHeaders.length > 0 ? requestHeaders : undefined,
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
			console.error('proxy error:', error);
			return new Response('Error fetching resource', {status: 500});
		}
	}

	const responseHeaders = setupCORSHeaders(new Headers(), originHeader, isPreflightRequest);
	const cf: CloudflareRequestCF | undefined = request.cf;

	let infoBody =
		'CLOUDFLARE-CORS-ANYWHERE\n\n' +
		'Source: https://github.com/Zibri/cloudflare-cors-anywhere\n\n' +
		`Usage: ${originUrl.origin}/?uri\n\n` +
		'Limits: 100,000 requests/day\n' +
		'        1,000 requests/10 minutes\n\n';

	if (originHeader != null && originHeader.length > 0) {
		infoBody += `Origin: ${originHeader}\n`;
	}
	if (connectingIp != null && connectingIp.length > 0) {
		infoBody += `IP: ${connectingIp}\n`;
	}
	if (cf?.country != null && cf.country.length > 0) {
		infoBody += `Country: ${cf.country}\n`;
	}
	if (cf?.colo != null && cf.colo.length > 0) {
		infoBody += `Datacenter: ${cf.colo}\n`;
	}
	if (customHeaders != null) {
		infoBody += `\nx-cors-headers: ${JSON.stringify(customHeaders)}`;
	}

	return new Response(infoBody, {
		status: 200,
		headers: responseHeaders,
	});
};

export const onRequest = wrappedOnRequest;
