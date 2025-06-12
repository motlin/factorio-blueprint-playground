export interface ParsedImgurUrl {
	id: string;
	type?: string;
	isDirect: boolean;
	isFromAlbum: boolean;
	normalizedUrl: string;
	warnings: string[];
}

export interface ImgurUrlParseResult {
	success: boolean;
	data?: ParsedImgurUrl;
	error?: string;
}

type PipelineResult<T> = {success: true; data: T} | {success: false; error: string};

interface ValidatedUrl {
	url: string;
}

interface ParsedUrl {
	urlObj: URL;
}

interface ExtractedInfo {
	id: string;
	type?: string;
	isDirect: boolean;
	isFromAlbum: boolean;
	warnings: string[];
}

export function parseImgurUrl(url: string): ImgurUrlParseResult {
	// Nested validation functions
	function validateUrl(url: string): PipelineResult<ValidatedUrl> {
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

		return {success: true, data: {url: trimmedUrl}};
	}

	function parseAndValidateUrl(data: ValidatedUrl): PipelineResult<ParsedUrl> {
		try {
			const urlObj = new URL(data.url);
			const validDomains = ['imgur.com', 'i.imgur.com', 'm.imgur.com'];

			if (!validDomains.includes(urlObj.hostname)) {
				return {
					success: false,
					error: 'URL must be from imgur.com domain',
				};
			}

			return {success: true, data: {urlObj}};
		} catch {
			return {
				success: false,
				error: 'Invalid URL format',
			};
		}
	}

	function extractImageInfo(data: ParsedUrl): PipelineResult<ExtractedInfo> {
		const {urlObj} = data;

		// Nested parser functions
		function parseDirectImageUrl(pathname: string): {id: string; type: string} | null {
			const match = pathname.match(/^\/([a-zA-Z0-9]+)\.([a-zA-Z0-9]{3,4})$/);
			if (!match) return null;
			return {id: match[1], type: match[2]};
		}

		function parseAlbumUrl(pathname: string, hash: string): {id: string; warnings: string[]} | null {
			const albumMatch = pathname.match(/^\/(?:a|gallery)\/([a-zA-Z0-9]+)$/);
			if (!albumMatch) return null;

			let id = albumMatch[1];
			const warnings: string[] = [];

			if (hash) {
				const hashId = hash.substring(1);
				if (/^[a-zA-Z0-9]+$/.test(hashId)) {
					id = hashId;
					warnings.push('Detected hash fragment in album URL - using hash as image ID');
				}
			} else {
				warnings.push('Album URL detected - will use first image');
			}

			return {id, warnings};
		}

		function parsePageUrl(pathname: string): string | null {
			const match = pathname.match(/^\/([a-zA-Z0-9]+)$/);
			return match ? match[1] : null;
		}

		// Nested handler functions
		function handleDirectImageUrl(pathname: string): PipelineResult<ExtractedInfo> {
			const parsed = parseDirectImageUrl(pathname);
			if (!parsed) {
				return {
					success: false,
					error: 'Invalid direct image URL format',
				};
			}

			return {
				success: true,
				data: {
					id: parsed.id,
					type: parsed.type,
					isDirect: true,
					isFromAlbum: false,
					warnings: [],
				},
			};
		}

		function handleAlbumOrPageUrl(pathname: string, hash: string): PipelineResult<ExtractedInfo> {
			const albumParsed = parseAlbumUrl(pathname, hash);
			if (albumParsed) {
				return {
					success: true,
					data: {
						id: albumParsed.id,
						type: undefined,
						isDirect: false,
						isFromAlbum: true,
						warnings: albumParsed.warnings,
					},
				};
			}

			const pageId = parsePageUrl(pathname);
			if (!pageId) {
				return {
					success: false,
					error: 'Invalid Imgur URL format',
				};
			}

			return {
				success: true,
				data: {
					id: pageId,
					type: undefined,
					isDirect: false,
					isFromAlbum: false,
					warnings: [],
				},
			};
		}

		if (urlObj.hostname === 'i.imgur.com') {
			return handleDirectImageUrl(urlObj.pathname);
		}

		if (urlObj.hostname === 'imgur.com' || urlObj.hostname === 'm.imgur.com') {
			return handleAlbumOrPageUrl(urlObj.pathname, urlObj.hash);
		}

		return {
			success: false,
			error: 'Unsupported Imgur domain',
		};
	}

	function validateAndNormalize(data: ExtractedInfo): ImgurUrlParseResult {
		function validateImgurId(id: string): string[] {
			const warnings: string[] = [];
			if (id.length < 5 || id.length > 10) {
				warnings.push('Image ID length is outside typical range (5-10 characters)');
			}
			return warnings;
		}

		const idWarnings = validateImgurId(data.id);
		const allWarnings = [...data.warnings, ...idWarnings];

		const normalizedUrl = data.type
			? `https://i.imgur.com/${data.id}.${data.type}`
			: `https://imgur.com/${data.id}`;

		return {
			success: true,
			data: {
				id: data.id,
				type: data.type,
				isDirect: data.isDirect,
				isFromAlbum: data.isFromAlbum,
				normalizedUrl,
				warnings: allWarnings,
			},
		};
	}

	// Pipeline execution
	const validationResult = validateUrl(url);
	if (!validationResult.success) return validationResult;

	const urlParseResult = parseAndValidateUrl(validationResult.data);
	if (!urlParseResult.success) return urlParseResult;

	const imageInfoResult = extractImageInfo(urlParseResult.data);
	if (!imageInfoResult.success) return imageInfoResult;

	return validateAndNormalize(imageInfoResult.data);
}
