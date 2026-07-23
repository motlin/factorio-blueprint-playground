import type {Blueprint, BlueprintBook, BlueprintString, Icon} from '../parsing/types';

export interface BlueprintEditorMetadata {
	description: string;
	icons: Icon[];
	label: string;
}

export interface BlueprintSnapGrid {
	absolute: boolean;
	enabled: boolean;
	height: number;
	positionX: number;
	positionY: number;
	width: number;
}

const disabledSnapGrid: BlueprintSnapGrid = {
	absolute: true,
	enabled: false,
	height: 1,
	positionX: 0,
	positionY: 0,
	width: 1,
};

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

export function blueprintSnapGrid(root: BlueprintString): BlueprintSnapGrid {
	const blueprint = root.blueprint;
	if (blueprint === undefined) {
		throw new Error('Snap-to-grid settings require a blueprint.');
	}
	const grid = blueprint['snap-to-grid'];
	if (grid === undefined) {
		return {...disabledSnapGrid};
	}
	const position = blueprint['position-relative-to-grid'];
	return {
		absolute: blueprint['absolute-snapping'] ?? false,
		enabled: true,
		height: grid.y,
		positionX: position?.x ?? 0,
		positionY: position?.y ?? 0,
		width: grid.x,
	};
}

export function applyBlueprintSnapGrid(root: BlueprintString, settings: BlueprintSnapGrid): BlueprintString {
	const blueprint = root.blueprint;
	if (blueprint === undefined) {
		throw new Error('Snap-to-grid settings require a blueprint.');
	}
	const updated = {...blueprint};
	delete updated['snap-to-grid'];
	delete updated['absolute-snapping'];
	delete updated['position-relative-to-grid'];
	if (settings.enabled) {
		updated['snap-to-grid'] = {x: settings.width, y: settings.height};
		updated['absolute-snapping'] = settings.absolute;
		if (settings.absolute) {
			updated['position-relative-to-grid'] = {
				x: settings.positionX,
				y: settings.positionY,
			};
		}
	}
	return {...root, blueprint: updated};
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
