import {useEffect, useState} from 'react';

import type {BlueprintString} from '../parsing/types';
import type {BlueprintJobRunner} from './blueprintJobRunner';

export type BlueprintJobState<Result> = {result: Result} | {error: string} | undefined;

/**
 * Runs a job for the blueprint and cancels it when the blueprint changes. Results are tagged with
 * their blueprint so a slow answer for a previous selection is never shown; undefined means still running.
 */
export function useBlueprintJob<Result>(
	blueprint: BlueprintString | undefined,
	run: BlueprintJobRunner<Result>,
): BlueprintJobState<Result> {
	const [settled, setSettled] = useState<{blueprint: BlueprintString; state: BlueprintJobState<Result>}>();

	useEffect(() => {
		if (blueprint === undefined) return undefined;
		const controller = new AbortController();
		run(blueprint, controller.signal).then(
			(result) => {
				setSettled({blueprint, state: {result}});
			},
			(error: unknown) => {
				if (controller.signal.aborted) return;
				setSettled({blueprint, state: {error: error instanceof Error ? error.message : String(error)}});
			},
		);
		return () => {
			controller.abort();
		};
	}, [blueprint, run]);

	return blueprint !== undefined && settled?.blueprint === blueprint ? settled.state : undefined;
}
