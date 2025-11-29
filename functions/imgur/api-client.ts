import type {ParsedImgurUrl} from './url-parser';

export interface ResolvedImgurImage {
	id: string;
	type: string; // MIME type
	extension: string;
	width?: number;
	height?: number;
	title?: string;
	isFromAlbum: boolean;
	warnings: string[];
}

export interface ImgurApiResponse {
	success: boolean;
	data?: ResolvedImgurImage;
	error?: string;
}

interface ImgurImageData {
	id: string;
	link?: string;
	type?: string;
	width?: number;
	height?: number;
	title?: string;
}

interface ImgurAlbumData {
	title?: string;
	images?: ImgurImageData[];
}

interface SentryLike {
	withScope: (
		callback: (scope: {
			setTags: (tags: Record<string, string>) => void;
			setExtras: (extras: Record<string, unknown>) => void;
		}) => void,
	) => void;
	captureException: (error: unknown) => void;
}

export async function resolveImgurImage(
	parsedUrl: ParsedImgurUrl,
	clientId: string,
	sentry?: SentryLike,
): Promise<ImgurApiResponse> {
	const headers = {
		Authorization: `Client-ID ${clientId}`,
		'User-Agent': 'FactorioPrints/1.0',
	};

	// Nested helper functions
	function extractExtension(link: string | undefined): string {
		const match = link?.match(/\.([a-zA-Z0-9]{3,4})$/);
		return match ? match[1] : 'png';
	}

	function buildImageResponse(imageData: ImgurImageData): ImgurApiResponse {
		const extension = extractExtension(imageData.link);

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

	function buildAlbumResponse(albumData: ImgurAlbumData): ImgurApiResponse {
		if (!(albumData.images && albumData.images.length > 0)) {
			return {
				success: false,
				error: 'Album is empty',
			};
		}

		const firstImage = albumData.images[0];
		const extension = extractExtension(firstImage.link);
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

	function handleApiError(status: number): ImgurApiResponse {
		if (status === 404) {
			return {
				success: false,
				error: 'Image or album not found',
			};
		}

		if (status === 403) {
			return {
				success: false,
				error: 'Access denied - image may be private',
			};
		}

		return {
			success: false,
			error: `Imgur API error: ${status}`,
		};
	}

	try {
		// Try single image first
		const singleImageResponse = await fetch(`https://api.imgur.com/3/image/${parsedUrl.id}`, {headers});

		if (singleImageResponse.ok) {
			const data = (await singleImageResponse.json()) as {data: ImgurImageData};
			return buildImageResponse(data.data);
		}

		// If single image fails and this looks like it could be an album, try album API
		if (parsedUrl.isFromAlbum || singleImageResponse.status === 404) {
			const albumResponse = await fetch(`https://api.imgur.com/3/album/${parsedUrl.id}`, {headers});

			if (albumResponse.ok) {
				const data = (await albumResponse.json()) as {data: ImgurAlbumData};
				return buildAlbumResponse(data.data);
			}

			return handleApiError(albumResponse.status);
		}

		return handleApiError(singleImageResponse.status);
	} catch (error) {
		if (sentry) {
			sentry.withScope((scope) => {
				scope.setTags({
					function: 'resolveImgurImage',
					imageId: parsedUrl.id,
				});
				scope.setExtras({
					imageType: parsedUrl.type,
					isDirect: parsedUrl.isDirect,
					isFromAlbum: parsedUrl.isFromAlbum,
				});
				sentry.captureException(error);
			});
		}
		return {
			success: false,
			error: 'Failed to connect to Imgur API',
		};
	}
}
