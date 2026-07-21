import type {LintRule} from '../types';
import {emptyBlueprintRule} from './emptyBlueprint';
import {unpairedUndergroundBeltRule} from './unpairedUndergroundBelt';

export const rules: LintRule[] = [emptyBlueprintRule, unpairedUndergroundBeltRule];
