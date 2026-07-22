import type {Blueprint, BlueprintBook, BlueprintString, Icon} from '../parsing/types';

export interface BlueprintEditorMetadata {
	description: string;
	icons: Icon[];
	label: string;
}

export function blueprintEditorMetadata(root: BlueprintString): BlueprintEditorMetadata {
	const metadata = root.blueprint ?? root.blueprint_book;
	if (metadata === undefined) {
		throw new Error('The Blueprint Editor requires a blueprint or blueprint book.');
	}
	return {
		description: metadata.description ?? '',
		icons: metadata.icons ?? [],
		label: metadata.label ?? '',
	};
}

export function applyBlueprintEditorMetadata(
	root: BlueprintString,
	metadata: BlueprintEditorMetadata,
): BlueprintString {
	function update(value: Blueprint): Blueprint;
	function update(value: BlueprintBook): BlueprintBook;
	function update(value: Blueprint | BlueprintBook): Blueprint | BlueprintBook {
		const result = {...value};
		delete result.description;
		delete result.icons;
		delete result.label;
		if (metadata.description !== '') result.description = metadata.description;
		if (metadata.icons.length > 0) result.icons = metadata.icons;
		if (metadata.label !== '') result.label = metadata.label;
		return result;
	}
	if (root.blueprint !== undefined) {
		return {...root, blueprint: update(root.blueprint)};
	}
	if (root.blueprint_book !== undefined) {
		return {...root, blueprint_book: update(root.blueprint_book)};
	}
	throw new Error('The Blueprint Editor requires a blueprint or blueprint book.');
}
