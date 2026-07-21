import type {BlueprintString, Entity} from '../../src/parsing/types';

const VERSION_1_1 = 281479278886912;
const VERSION_2_0 = 562949958139904;

export function makeBlueprint(entities: Entity[] = [], major = 2): BlueprintString {
	return {
		blueprint: {
			item: 'blueprint',
			version: major === 1 ? VERSION_1_1 : VERSION_2_0,
			entities,
		},
	};
}
