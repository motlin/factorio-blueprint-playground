import type {LintRule} from '../types';
import {duplicateEntitiesRule} from './duplicateEntities';
import {emptyBlueprintRule} from './emptyBlueprint';
import {inserterFacingNothingRule} from './inserterFacingNothing';
import {powerPoleCoverageRule} from './powerPoleCoverage';
import {roboportCoverageRule} from './roboportCoverage';
import {unpairedPipeToGroundRule} from './unpairedPipeToGround';
import {unpairedUndergroundBeltRule} from './unpairedUndergroundBelt';

export const rules: LintRule[] = [
	emptyBlueprintRule,
	unpairedUndergroundBeltRule,
	unpairedPipeToGroundRule,
	duplicateEntitiesRule,
	inserterFacingNothingRule,
	powerPoleCoverageRule,
	roboportCoverageRule,
];
