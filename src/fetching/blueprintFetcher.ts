import {deserializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

export type BlueprintFetchMethod = 'url' | 'json' | 'data';

export type BlueprintFetchSuccess = {
	// TODO 2024-12-03: fetchMethod is not used, but may be used in the future for history
	success: true;
	pasted: string;
	fetchMethod: BlueprintFetchMethod;
	blueprintString: BlueprintString;
	// TODO 2024-12-03: rename to disqusId
	id?: string;
};

export type BlueprintFetchFailure = {
	success: false;
	pasted: string;
	error: Error;
};

export type BlueprintFetchResult = BlueprintFetchSuccess | BlueprintFetchFailure | undefined;

interface BlueprintFetchSource {
	apiUrl: (url: URL) => string;
	responseType: 'json' | 'text';
	extractBlueprintString: (data: unknown) => string;
	extractId: (url: URL) => string | undefined;
}

const factorioSchoolSourceConfig: BlueprintFetchSource = {
	apiUrl: (url) => {
		const match = url.href.match(/factorio\.school\/view\/([^/\s#]+)/);
		if (!match) throw new Error('Invalid Factorio School URL');
		return `https://www.factorio.school/api/blueprint/${match[1]}`;
	},
	responseType: 'json',
	extractBlueprintString: (data) => {
		if (!data || typeof data !== 'object' || !('blueprintString' in data)) {
			throw new Error('Invalid response from Factorio School');
		}
		const bpData = data as {blueprintString: {blueprintString: string}};
		return bpData.blueprintString.blueprintString;
	},
	extractId: (url) => {
		const match = url.pathname.match(/view\/([^/\s#]+)/);
		if (!match) throw new Error('Invalid Factorio School URL');
		return match?.[1];
	},
};

const factorioPrintsSourceConfig: BlueprintFetchSource = {
	apiUrl: (url) => {
		const match = url.href.match(/factorioprints\.com\/view\/([^/\s#]+)/);
		if (!match) throw new Error('Invalid Factorio Prints URL');
		return `https://facorio-blueprints.firebaseio.com/blueprints/${match[1]}/blueprintString.json`;
	},
	responseType: 'json',
	extractBlueprintString: (data) => {
		if (!data || typeof data !== 'string') {
			throw new Error('Invalid response from Factorio Prints');
		}
		return data;
	},
	extractId: (url) => {
		const match = url.pathname.match(/view\/([^/\s#]+)/);
		if (!match) throw new Error('Invalid Factorio Prints URL');
		return match?.[1];
	},
};

const factorioBinCdnSourceConfig: BlueprintFetchSource = {
	apiUrl: (url) => {
		return `/proxy?${url.href}`;
	},
	responseType: 'text',
	extractBlueprintString: (data) => {
		if (typeof data !== 'string') {
			throw new Error('Invalid response from Factorio Bin CDN');
		}
		return data;
	},
	extractId: (_url) => {
		return undefined;
	},
};

const factorioBinDirectSourceConfig: BlueprintFetchSource = {
	apiUrl: (url) => {
		return `/proxy?${url.href}/blueprint.txt`;
	},
	responseType: 'text',
	extractBlueprintString: (data) => {
		if (typeof data !== 'string') {
			throw new Error('Invalid response from Factorio Bin Direct');
		}
		return data;
	},
	extractId: (_url) => {
		return undefined;
	},
};

const SOURCE_CONFIGS: Record<string, BlueprintFetchSource> = {
	'factorio.school': factorioSchoolSourceConfig,
	'factorioprints.com': factorioPrintsSourceConfig,
	'cdn.factoriobin.com': factorioBinCdnSourceConfig,
	'factoriobin.com': factorioBinDirectSourceConfig,
};

async function fetchUrl(pasted: string): Promise<BlueprintFetchResult> {
	try {
		const url = new URL(pasted);
		const domain = url.hostname;

		const fetchConfig = SOURCE_CONFIGS[domain];
		if (!fetchConfig) {
			return {
				success: false,
				error: new Error('Unsupported blueprint source: ' + domain),
				pasted,
			};
		}

		const response = await fetch(fetchConfig.apiUrl(url));
		if (!response.ok) {
			return {
				success: false,
				error: new Error(`Failed to fetch blueprint: ${response.statusText}`),
				pasted,
			};
		}

		const data = await (fetchConfig.responseType === 'json' ? response.json() : response.text());
		const blueprintString = fetchConfig.extractBlueprintString(data);
		const blueprint = deserializeBlueprint(blueprintString);
		const id = fetchConfig.extractId(url);

		return {
			success: true,
			fetchMethod: 'url' as const,
			pasted,
			blueprintString: blueprint,
			id,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			pasted,
		};
	}
}

function fetchJson(pasted: string): BlueprintFetchResult {
	try {
		const blueprint = JSON.parse(pasted) as BlueprintString;

		return {
			success: true,
			fetchMethod: 'json' as const,
			pasted,
			blueprintString: blueprint,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			pasted,
		};
	}
}

function fetchData(pasted: string): BlueprintFetchResult {
	try {
		const blueprint: BlueprintString = deserializeBlueprint(pasted);

		return {
			success: true,
			fetchMethod: 'data' as const,
			pasted,
			blueprintString: blueprint,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			pasted,
		};
	}
}

export async function fetchBlueprint(deps: {pasted: string | undefined}): Promise<BlueprintFetchResult> {
	const pasted = deps.pasted;
	if (!pasted) {
		return undefined;
	}

	// Simple URL detection
	if (pasted.match(/^https?:\/\//i)) {
		return await fetchUrl(pasted);
	}

	// Simple JSON detection - try parsing as JSON
	try {
		JSON.parse(pasted);
		return fetchJson(pasted);
	} catch {
		// If not URL or JSON, assume it's blueprint data
		return fetchData(pasted);
	}
}
