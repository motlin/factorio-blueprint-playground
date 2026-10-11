import {
	answerBlueprintJob,
	type BlueprintJobRequest,
	type BlueprintJobResponse,
} from '../../workers/blueprintJobRunner';
import type {BlueprintString} from '../types';
import {classify} from './classify';
import {extractNames} from './nameExtractor';
import type {DetectionResult, ModDatabase} from './types';

export function detectMods(blueprint: BlueprintString, database: ModDatabase): DetectionResult {
	return classify(extractNames(blueprint), database);
}

export function handleModDetectionRequest(
	request: BlueprintJobRequest,
	database: ModDatabase,
): BlueprintJobResponse<DetectionResult> {
	return answerBlueprintJob(request, (blueprint) => detectMods(blueprint, database));
}
