import type {BlueprintString} from './types';

export interface BlueprintSource {
	encoded: string;
	// Selection path inside the decoded root, in extractBlueprint's format; '' is the root itself.
	path: string;
}

const sources = new WeakMap<BlueprintString, BlueprintSource>();

/**
 * Records where each blueprint in a decoded string came from. Workers can then be sent the short
 * encoded string instead of the parsed blueprint, which takes the page's thread far longer to copy.
 */
export function rememberBlueprintSource(blueprint: BlueprintString, encoded: string, path = ''): void {
	// A malformed string can decode to any JSON value; consumers report those, so skip them here.
	const decoded: unknown = blueprint;
	if (typeof decoded !== 'object' || decoded === null) return;
	sources.set(blueprint, {encoded, path});
	for (const [index, child] of (blueprint.blueprint_book?.blueprints ?? []).entries()) {
		rememberBlueprintSource(child, encoded, path === '' ? `${index + 1}` : `${path}.${index + 1}`);
	}
}

export function blueprintSource(blueprint: BlueprintString): BlueprintSource | undefined {
	return sources.get(blueprint);
}
