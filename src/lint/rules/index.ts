import type {LintRule} from '../types';
import {duplicateEntitiesRule} from './duplicateEntities';
import {emptyBlueprintRule} from './emptyBlueprint';
import {inserterFacingNothingRule} from './inserterFacingNothing';
import {labeledInputsOutputsRule} from './labeledInputsOutputs';
import {powerPoleCoverageRule} from './powerPoleCoverage';

export const rules: LintRule[] = [
	emptyBlueprintRule,
	duplicateEntitiesRule,
	inserterFacingNothingRule,
	labeledInputsOutputsRule,
	powerPoleCoverageRule,
];
