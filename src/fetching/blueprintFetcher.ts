import {deserializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

/**
 * Defines the supported methods for blueprint fetching.
 * Each method corresponds to a different source type handling strategy.
 */
export type BlueprintFetchMethod = 'url' | 'json' | 'data';

/**
 * Base interface defining common properties across all blueprint fetch results.
 * Provides core structure that specific result types extend.
 */
export interface BaseBlueprintResult {
	fetchMethod: BlueprintFetchMethod;
	pasted: string;
	blueprintString: BlueprintString;
}

/**
 * Represents the result of fetching a blueprint from a URL source.
 * Extends base result with additional URL-specific identifier.
 */
export interface UrlBlueprintResult extends BaseBlueprintResult {
	fetchMethod: 'url';
	id: string;
}

/**
 * Union type representing all possible blueprint fetch results.
 * Used as the return type for the fetchBlueprint function.
 */
export type BlueprintFetchResult = BaseBlueprintResult | UrlBlueprintResult | undefined;

interface BlueprintFetchSource {
	apiUrl: (url: URL) => string;
	extractBlueprintString: (data: unknown) => string;
	extractId: (url: URL) => string;
}

const factorioSchoolSourceConfig: BlueprintFetchSource = {
	apiUrl: (url) => {
		const match = url.href.match(/factorio\.school\/view\/([^/\s#]+)/);
		if (!match) throw new Error('Invalid Factorio School URL');
		return `https://www.factorio.school/api/blueprint/${match[1]}`;
	},
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

const SOURCE_CONFIGS: Record<string, BlueprintFetchSource> = {
	'factorio.school': factorioSchoolSourceConfig,
	'factorioprints.com': factorioPrintsSourceConfig,
};

async function fetchUrl(pasted: string): Promise<UrlBlueprintResult> {
	const url = new URL(pasted);
	const domain = url.hostname;

	const fetchConfig = SOURCE_CONFIGS[domain];
	if (!fetchConfig) {
		throw new Error('Unsupported blueprint source: ' + domain);
	}

	const response = await fetch(fetchConfig.apiUrl(url));
	if (!response.ok) {
		throw new Error(`Failed to fetch blueprint: ${response.statusText}`);
	}

	const data: unknown = await response.json();
	const blueprintString = fetchConfig.extractBlueprintString(data);
	const blueprint = deserializeBlueprint(blueprintString);

	// Extract and store blueprint ID if from a supported source
	const id = fetchConfig.extractId(url);

	return {fetchMethod: 'url', pasted: pasted, blueprintString: blueprint, id};
}

function fetchJson(pasted: string): BaseBlueprintResult {
	const blueprint = JSON.parse(pasted) as BlueprintString;
	return {fetchMethod: 'json', pasted: pasted, blueprintString: blueprint};
}

function fetchData(pasted: string): BaseBlueprintResult {
	const blueprint: BlueprintString = deserializeBlueprint(pasted);

	return {fetchMethod: 'data', pasted: pasted, blueprintString: blueprint};
}

export async function fetchBlueprint(deps: {pasted: string | undefined}): Promise<BlueprintFetchResult> {
	const pasted = deps.pasted;
	if (!pasted) {
		return;
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
