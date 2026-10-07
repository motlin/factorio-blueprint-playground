import type {BlueprintString, Entity} from '../../src/parsing/types';

const VERSION_1_1 = 281479278886912;
const VERSION_2_0 = 562949958139904;

// Far-off chests put the test entities in the middle of a blueprint, so nothing reads as an edge input or output.
const MIDDLE_OF_BLUEPRINT_ANCHORS: Entity[] = [
	{entity_number: 90_001, name: 'wooden-chest', position: {x: -1000.5, y: -1000.5}},
	{entity_number: 90_002, name: 'wooden-chest', position: {x: 1000.5, y: 1000.5}},
];

export function makeBlueprint(entities: Entity[] = [], major = 2, {atEdges = false} = {}): BlueprintString {
	return {
		blueprint: {
			item: 'blueprint',
			version: major === 1 ? VERSION_1_1 : VERSION_2_0,
			entities: atEdges || entities.length === 0 ? entities : [...entities, ...MIDDLE_OF_BLUEPRINT_ANCHORS],
		},
	};
}
