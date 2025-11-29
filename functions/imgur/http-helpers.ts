export function setupCORSHeaders(headers: Headers, originHeader: string | null, isPreflightRequest: boolean): Headers {
	const allowedOrigins = [
		'http://localhost:3000',
		'http://localhost:5173',
		'https://factorioprints.com',
		'https://factorio.school',
		'https://factorio-blueprint-playground.pages.dev',
	];

	const origin =
		originHeader &&
		allowedOrigins.some((allowed) =>
			originHeader.match(new RegExp(allowed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*'))),
		)
			? originHeader
			: '*';

	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (isPreflightRequest) {
		headers.set('Access-Control-Max-Age', '86400');
	}

	return headers;
}

export function createJsonResponse(body: unknown, status: number, originHeader: string | null): Response {
	const headers = setupCORSHeaders(new Headers(), originHeader, false);
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...Object.fromEntries(headers),
			'Content-Type': 'application/json',
		},
	});
}

// Request handler factory functions
export function createRequestHandlers(originHeader: string | null) {
	return {
		handleCorsPreflightRequest(): Response {
			const headers = setupCORSHeaders(new Headers(), originHeader, true);
			return new Response(null, {status: 200, headers});
		},

		handleInvalidMethod(): Response {
			return createJsonResponse({success: false, error: 'Method not allowed'}, 405, originHeader);
		},

		handleMissingConfiguration(): Response {
			return createJsonResponse({success: false, error: 'Imgur API not configured'}, 500, originHeader);
		},

		handleMissingUrl(): Response {
			return createJsonResponse({success: false, error: 'URL is required'}, 400, originHeader);
		},

		handleError(error: string, status = 400): Response {
			return createJsonResponse({success: false, error}, status, originHeader);
		},
	};
}
