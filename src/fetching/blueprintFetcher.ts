import {logger} from '../lib/sentry';
import {deserializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

export type BlueprintFetchMethod = 'url' | 'json' | 'data';

export function getSourceLabel(fetchMethod?: BlueprintFetchMethod): string {
	switch (fetchMethod) {
		case 'url':
			return 'External URL';
		case 'json':
			return 'JSON Import';
		case 'data':
			return 'Direct Paste';
		default:
			return 'Unknown';
	}
}

interface BlueprintFetchBase {
	success: boolean;
	pasted: string;
	fetchMethod: BlueprintFetchMethod;
}

export interface BlueprintFetchSuccess extends BlueprintFetchBase {
	success: true;
	blueprintString: BlueprintString;
	// TODO 2024-12-03: rename to disqusId
	id?: string;
}

export interface BlueprintFetchFailure extends BlueprintFetchBase {
	success: false;
	error: Error;
}

export type BlueprintFetchResult = BlueprintFetchSuccess | BlueprintFetchFailure | undefined;

interface SourceFetchResult {
	success: boolean;
	blueprintString?: string;
	id?: string;
	error?: Error;
}

interface BlueprintFetchSource {
	fetchBlueprint: (url: URL) => Promise<SourceFetchResult>;
}

/**
 * Splits a blueprint key into CDN-compatible prefix and suffix.
 * @param key Full blueprint key
 * @returns Object containing 3-char prefix and remaining suffix
 */
function splitBlueprintKey(key: string): {prefix: string; suffix: string} {
	const prefix = key.slice(0, 3);
	const suffix = key.slice(3);
	return {prefix, suffix};
}

/**
 * Constructs a CDN URL for a given blueprint key.
 * @param key Blueprint key to fetch
 * @returns Full CDN URL for the blueprint
 */
function constructCdnUrl(key: string): string {
	const {prefix, suffix} = splitBlueprintKey(key);
	return `https://factorio-blueprint-key-cdn.pages.dev/${prefix}/${suffix}.txt`;
}

const factorioSchoolSourceConfig: BlueprintFetchSource = {
	async fetchBlueprint(url: URL): Promise<SourceFetchResult> {
		const match = url.href.match(/(?:www\.)?factorio\.school\/view\/([^/\s#]+)/);
		if (!match) {
			return {
				success: false,
				error: new Error('Invalid Factorio School URL'),
			};
		}

		try {
			const key = match[1];

			const cdnUrl = constructCdnUrl(key);
			const cdnResponse = await fetch(cdnUrl).catch(() => null);

			if (cdnResponse?.ok) {
				const blueprintString = await cdnResponse.text();
				return {
					success: true,
					blueprintString,
					id: key,
				};
			}

			const factorioSchoolUrl = `https://factorio.school/api/blueprint/${key}`;
			const proxyUrl = `/proxy?${factorioSchoolUrl}`;
			const fallbackResponse = await fetch(proxyUrl);

			if (!fallbackResponse.ok) {
				return {
					success: false,
					error: new Error(`HTTP error! status: ${fallbackResponse.status}`),
				};
			}

			type FactorioSchoolBlueprintString = {
				blueprintString: string;
			};

			type FactorioSchoolResponse = {
				blueprintString?: FactorioSchoolBlueprintString;
			};

			const jsonData = await fallbackResponse.json();

			// Type guards
			if (typeof jsonData !== 'object' || jsonData === null) {
				return {
					success: false,
					error: new Error('Invalid API response format'),
				};
			}

			const typedData = jsonData as FactorioSchoolResponse;
			if (!typedData.blueprintString?.blueprintString) {
				return {
					success: false,
					error: new Error('Blueprint data missing in API response'),
				};
			}

			return {
				success: true,
				blueprintString: typedData.blueprintString.blueprintString,
				id: key,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	},
};

const factorioPrintsSourceConfig: BlueprintFetchSource = {
	async fetchBlueprint(url: URL): Promise<SourceFetchResult> {
		const match = url.href.match(/(?:www\.)?factorioprints\.com\/view\/([^/\s#]+)/);
		if (!match) {
			return {
				success: false,
				error: new Error('Invalid Factorio Prints URL'),
			};
		}

		const key = match[1];

		// Try CDN first
		try {
			const cdnUrl = constructCdnUrl(key);
			const cdnResponse = await fetch(cdnUrl);

			if (cdnResponse.ok) {
				const blueprintString = await cdnResponse.text();
				return {
					success: true,
					blueprintString,
					id: key,
				};
			}
		} catch (error) {
			logger.warn('CDN fetch failed, falling back to Firebase', {
				context: 'fetchFromFactorioSchool',
				cdnUrl,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		// Fallback to Firebase
		try {
			const fallbackUrl = `https://facorio-blueprints.firebaseio.com/blueprints/${key}/blueprintString.json`;
			const response = await fetch(fallbackUrl);

			if (!response.ok) {
				return {
					success: false,
					error: new Error(`HTTP error! status: ${response.status}`),
				};
			}

			const data = await response.json();
			if (typeof data !== 'string') {
				return {
					success: false,
					error: new Error('Invalid response from Factorio Prints'),
				};
			}

			return {
				success: true,
				blueprintString: data,
				id: key,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	},
};

const factorioBinCdnSourceConfig: BlueprintFetchSource = {
	async fetchBlueprint(url: URL): Promise<SourceFetchResult> {
		try {
			const proxyUrl = `/proxy?${url.href}`;
			const response = await fetch(proxyUrl);

			if (!response.ok) {
				return {
					success: false,
					error: new Error(`HTTP error! status: ${response.status}`),
				};
			}

			const blueprintString = await response.text();
			return {success: true, blueprintString};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	},
};

const factorioBinDirectSourceConfig: BlueprintFetchSource = {
	async fetchBlueprint(url: URL): Promise<SourceFetchResult> {
		try {
			const proxyUrl = `/proxy?${url.href}/blueprint.txt`;
			const response = await fetch(proxyUrl);

			if (!response.ok) {
				return {
					success: false,
					error: new Error(`HTTP error! status: ${response.status}`),
				};
			}

			const blueprintString = await response.text();
			return {success: true, blueprintString};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	},
};

const SOURCE_CONFIGS: Record<string, BlueprintFetchSource> = {
	'factorio.school': factorioSchoolSourceConfig,
	'www.factorio.school': factorioSchoolSourceConfig,
	'factorioprints.com': factorioPrintsSourceConfig,
	'www.factorioprints.com': factorioPrintsSourceConfig,
	'cdn.factoriobin.com': factorioBinCdnSourceConfig,
	'factoriobin.com': factorioBinDirectSourceConfig,
	'www.factoriobin.com': factorioBinDirectSourceConfig,
};

async function fetchUrlImpl(pasted: string): Promise<BlueprintFetchSuccess | BlueprintFetchFailure> {
	try {
		const url = new URL(pasted);
		const domain = url.hostname;

		const fetchConfig = SOURCE_CONFIGS[domain];
		if (!fetchConfig) {
			return {
				success: false,
				error: new Error(`Unsupported blueprint source: ${domain}`),
				pasted,
				fetchMethod: 'url',
			};
		}

		const result = await fetchConfig.fetchBlueprint(url);

		if (!(result.success && result.blueprintString)) {
			return {
				success: false,
				error: result.error ?? new Error('Unknown fetch error'),
				pasted,
				fetchMethod: 'url',
			};
		}

		const blueprint = deserializeBlueprint(result.blueprintString);
		return {
			success: true,
			fetchMethod: 'url',
			pasted,
			blueprintString: blueprint,
			id: result.id,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			pasted,
			fetchMethod: 'url',
		};
	}
}

export async function fetchUrl<
	TQueryClient extends {
		fetchQuery: <T>(options: {
			queryKey: unknown[];
			queryFn: () => Promise<T>;
			staleTime?: number;
			gcTime?: number;
		}) => Promise<T>;
	},
>(pasted: string, queryClient?: TQueryClient): Promise<BlueprintFetchSuccess | BlueprintFetchFailure> {
	return await queryClient.fetchQuery({
		queryKey: ['blueprint-url', pasted],
		queryFn: async () => fetchUrlImpl(pasted),
		staleTime: Infinity,
		gcTime: Infinity,
	});
}

function fetchJson(pasted: string, blueprintString: BlueprintString): BlueprintFetchSuccess | BlueprintFetchFailure {
	return {
		success: true,
		fetchMethod: 'json' as const,
		pasted,
		blueprintString,
	};
}

function fetchData(pasted: string): BlueprintFetchSuccess | BlueprintFetchFailure {
	try {
		const blueprintString: BlueprintString = deserializeBlueprint(pasted);

		return {
			success: true,
			fetchMethod: 'data' as const,
			pasted,
			blueprintString,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			pasted,
			fetchMethod: 'data',
		};
	}
}

export async function fetchBlueprint<
	TQueryClient extends {
		fetchQuery: <T>(options: {
			queryKey: unknown[];
			queryFn: () => Promise<T>;
			staleTime?: number;
			gcTime?: number;
		}) => Promise<T>;
	},
>(deps: {pasted: string | undefined}, queryClient: TQueryClient): Promise<BlueprintFetchResult> {
	const pasted = deps.pasted;
	if (!pasted) {
		return undefined;
	}

	// Simple URL detection
	if (pasted.match(/^https?:\/\//i)) {
		return await fetchUrl(pasted, queryClient);
	}

	// Simple JSON detection - try parsing as JSON
	try {
		const blueprintString = JSON.parse(pasted) as BlueprintString;
		return fetchJson(pasted, blueprintString);
	} catch {
		// If not URL or JSON, assume it's blueprint data
		return fetchData(pasted);
	}
}
