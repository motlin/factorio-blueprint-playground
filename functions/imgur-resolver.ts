import type {EventContext} from '@cloudflare/workers-types';

interface ParsedImgurUrl {
	id: string;
	type?: string;
	isDirect: boolean;
	isFromAlbum: boolean;
	normalizedUrl: string;
	warnings: string[];
}

interface ImgurUrlParseResult {
	success: boolean;
	data?: ParsedImgurUrl;
	error?: string;
}

interface ResolvedImgurImage {
	id: string;
	type: string; // MIME type
	extension: string;
	width?: number;
	height?: number;
	title?: string;
	isFromAlbum: boolean;
	warnings: string[];
}

interface ImgurApiResponse {
	success: boolean;
	data?: ResolvedImgurImage;
	error?: string;
}

interface Env {
	IMGUR_CLIENT_ID: string;
}

function parseImgurUrl(url: string): ImgurUrlParseResult {
	if (!url) {
		return {
			success: false,
			error: 'URL is required and must be a string',
		};
	}

	const trimmedUrl = url.trim();
	if (!trimmedUrl) {
		return {
			success: false,
			error: 'URL cannot be empty',
		};
	}

	try {
		const urlObj = new URL(trimmedUrl);

		const validDomains = ['imgur.com', 'i.imgur.com', 'm.imgur.com'];
		if (!validDomains.includes(urlObj.hostname)) {
			return {
				success: false,
				error: 'URL must be from imgur.com domain',
			};
		}

		const warnings: string[] = [];
		let id: string;
		let type: string | undefined;
		let isDirect = false;
		let isFromAlbum = false;

		if (urlObj.hostname === 'i.imgur.com') {
			const match = urlObj.pathname.match(/^\/([a-zA-Z0-9]+)\.([a-zA-Z0-9]{3,4})$/);
			if (!match) {
				return {
					success: false,
					error: 'Invalid direct image URL format',
				};
			}

			// TODO 2025-06-13: these assignments are confusing. Can we move the return statements closer to the assignments?
			id = match[1];
			type = match[2];
			isDirect = true;
		}
		// Handle gallery/page URLs
		else if (urlObj.hostname === 'imgur.com' || urlObj.hostname === 'm.imgur.com') {
			// Handle album URLs with potential hash fragments
			const albumMatch = urlObj.pathname.match(/^\/(?:a|gallery)\/([a-zA-Z0-9]+)$/);
			if (albumMatch) {
				id = albumMatch[1];
				isFromAlbum = true;

				if (urlObj.hash) {
					// Remove the #
					const hashId = urlObj.hash.substring(1);
					if (/^[a-zA-Z0-9]+$/.test(hashId)) {
						// Use the hash as the image ID instead of album ID
						id = hashId;
						warnings.push('Detected hash fragment in album URL - using hash as image ID');
					}
				} else {
					warnings.push('Album URL detected - will use first image');
				}
			}
			// Handle direct page URLs
			else {
				const pageMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9]+)$/);
				if (!pageMatch) {
					return {
						success: false,
						error: 'Invalid Imgur URL format',
					};
				}

				id = pageMatch[1];
			}
		} else {
			return {
				success: false,
				error: 'Unsupported Imgur domain',
			};
		}

		// Validate ID length (Imgur IDs are typically 5-7 characters)
		if (id.length < 5 || id.length > 10) {
			warnings.push('Image ID length is outside typical range (5-10 characters)');
		}

		const normalizedUrl: string = type ? `https://i.imgur.com/${id}.${type}` : `https://imgur.com/${id}`;

		return {
			success: true,
			data: {
				id,
				type,
				isDirect,
				isFromAlbum,
				normalizedUrl,
				warnings,
			},
		};
	} catch (_error) {
		return {
			success: false,
			error: 'Invalid URL format',
		};
	}
}

// Call Imgur API to resolve image data
async function resolveImgurImage(parsedUrl: ParsedImgurUrl, clientId: string): Promise<ImgurApiResponse> {
	const headers = {
		Authorization: `Client-ID ${clientId}`,
		'User-Agent': 'FactorioPrints/1.0',
	};

	try {
		// Try as single image first
		let response = await fetch(`https://api.imgur.com/3/image/${parsedUrl.id}`, {headers});

		if (response.ok) {
			const data = (await response.json()) as any;
			const imageData = data.data;

			const linkMatch = imageData.link?.match(/\.([a-zA-Z0-9]{3,4})$/);
			const extension = linkMatch ? linkMatch[1] : 'png';

			return {
				success: true,
				data: {
					id: imageData.id,
					type: imageData.type || `image/${extension}`,
					extension,
					width: imageData.width,
					height: imageData.height,
					title: imageData.title,
					isFromAlbum: parsedUrl.isFromAlbum,
					warnings: parsedUrl.warnings,
				},
			};
		}

		// If single image fails and this looks like it could be an album, try album API
		if (parsedUrl.isFromAlbum || response.status === 404) {
			response = await fetch(`https://api.imgur.com/3/album/${parsedUrl.id}`, {headers});

			if (response.ok) {
				const data = (await response.json()) as any;
				const albumData = data.data;

				// Use first image from album
				if (!(albumData.images && albumData.images.length > 0)) {
					return {
						success: false,
						error: 'Album is empty',
					};
				}

				const firstImage = albumData.images[0];
				const linkMatch = firstImage.link?.match(/\.([a-zA-Z0-9]{3,4})$/);
				const extension = linkMatch ? linkMatch[1] : 'png';

				const warnings = [...parsedUrl.warnings];
				if (albumData.images.length > 1) {
					warnings.push(`Album contains ${albumData.images.length} images - using first image`);
				}

				return {
					success: true,
					data: {
						id: firstImage.id,
						type: firstImage.type || `image/${extension}`,
						extension,
						width: firstImage.width,
						height: firstImage.height,
						title: firstImage.title || albumData.title,
						isFromAlbum: true,
						warnings,
					},
				};
			}
		}

		// If both fail, return error based on status
		if (response.status === 404) {
			return {
				success: false,
				error: 'Image or album not found',
			};
		} else if (response.status === 403) {
			return {
				success: false,
				error: 'Access denied - image may be private',
			};
		} else {
			return {
				success: false,
				error: `Imgur API error: ${response.status}`,
			};
		}
	} catch (_error) {
		return {
			success: false,
			error: 'Failed to connect to Imgur API',
		};
	}
}

function setupCORSHeaders(headers: Headers, originHeader: string | null, isPreflightRequest: boolean): Headers {
	// Allow requests from factorio prints domains
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

export const onRequest = async (context: EventContext<Env, string, Record<string, unknown>>) => {
	const request = context.request;
	const env = context.env;
	const isPreflightRequest = request.method === 'OPTIONS';
	const originHeader = request.headers.get('Origin');

	// Handle CORS preflight
	if (isPreflightRequest) {
		const headers = setupCORSHeaders(new Headers(), originHeader, true);
		return new Response(null, {status: 200, headers});
	}

	// Only accept POST requests
	if (request.method !== 'POST') {
		const headers = setupCORSHeaders(new Headers(), originHeader, false);
		return new Response(JSON.stringify({success: false, error: 'Method not allowed'}), {
			status: 405,
			headers: {
				...Object.fromEntries(headers),
				'Content-Type': 'application/json',
			},
		});
	}

	// Check for Imgur client ID
	if (!env.IMGUR_CLIENT_ID) {
		const headers = setupCORSHeaders(new Headers(), originHeader, false);
		return new Response(JSON.stringify({success: false, error: 'Imgur API not configured'}), {
			status: 500,
			headers: {
				...Object.fromEntries(headers),
				'Content-Type': 'application/json',
			},
		});
	}

	try {
		// Parse request body
		const body = (await request.json()) as {url: string};

		if (!body.url) {
			const headers = setupCORSHeaders(new Headers(), originHeader, false);
			return new Response(JSON.stringify({success: false, error: 'URL is required'}), {
				status: 400,
				headers: {
					...Object.fromEntries(headers),
					'Content-Type': 'application/json',
				},
			});
		}

		// Parse the Imgur URL
		const parseResult = parseImgurUrl(body.url);
		if (!parseResult.success) {
			const headers = setupCORSHeaders(new Headers(), originHeader, false);
			return new Response(JSON.stringify(parseResult), {
				status: 400,
				headers: {
					...Object.fromEntries(headers),
					'Content-Type': 'application/json',
				},
			});
		}

		// Resolve the image via Imgur API
		const resolveResult = await resolveImgurImage(parseResult.data!, env.IMGUR_CLIENT_ID);

		const headers = setupCORSHeaders(new Headers(), originHeader, false);
		const status = resolveResult.success ? 200 : 400;

		return new Response(JSON.stringify(resolveResult), {
			status,
			headers: {
				...Object.fromEntries(headers),
				'Content-Type': 'application/json',
			},
		});
	} catch (_error) {
		const headers = setupCORSHeaders(new Headers(), originHeader, false);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Invalid request body',
			}),
			{
				status: 400,
				headers: {
					...Object.fromEntries(headers),
					'Content-Type': 'application/json',
				},
			},
		);
	}
};
