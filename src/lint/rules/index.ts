import type {LintRule} from '../types';
import {duplicateEntitiesRule} from './duplicateEntities';
import {emptyBlueprintRule} from './emptyBlueprint';
import {unpairedPipeToGroundRule} from './unpairedPipeToGround';
import {unpairedUndergroundBeltRule} from './unpairedUndergroundBelt';

export const rules: LintRule[] = [
	emptyBlueprintRule,
	unpairedUndergroundBeltRule,
	unpairedPipeToGroundRule,
	duplicateEntitiesRule,
];
