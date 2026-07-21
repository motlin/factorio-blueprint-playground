import {useQuery} from '@tanstack/react-query';
import {memo} from 'react';

import {classify} from '../../../../parsing/modDetection/classify';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {Confidence, DetectionResult, ModDatabase, Verdict} from '../../../../parsing/modDetection/types';
import type {BlueprintString} from '../../../../parsing/types';
import {Panel} from '../../../ui/Panel';

const DLC_SOURCE_IDS = new Set(['space-age', 'quality', 'elevated-rails']);

interface ModDetectionPanelProps {
	blueprint?: BlueprintString;
}

function pluralized(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

function overallConfidence(verdicts: Verdict[]): Confidence {
	if (verdicts.some((verdict) => verdict.confidence === 'low')) {
		return 'low';
	}
	if (verdicts.some((verdict) => verdict.confidence === 'medium')) {
		return 'medium';
	}
	return 'high';
}

function verdictSummary(result: DetectionResult): string {
	const requiredVerdicts = result.verdicts.filter(
		(verdict) => verdict.source !== 'base' && verdict.source !== 'base-1.1',
	);
	if (requiredVerdicts.length === 0) {
		if (result.unknownNames.length > 0) {
			return `Likely modded — ${pluralized(result.unknownNames.length, 'unknown name')}`;
		}
		return result.verdicts.some((verdict) => verdict.source === 'base-1.1') ? 'Vanilla 1.1' : 'Vanilla 2.0';
	}

	const labels = requiredVerdicts.map((verdict) => verdict.label).join(' + ');
	if (requiredVerdicts.every((verdict) => DLC_SOURCE_IDS.has(verdict.source))) {
		return `Requires ${labels}`;
	}

	const matchCount = requiredVerdicts.reduce((total, verdict) => total + verdict.matchCount, 0);
	return `Requires ${labels} — ${overallConfidence(requiredVerdicts)} confidence, ${pluralized(matchCount, 'matching name')}`;
}

function VerdictBreakdown({verdict}: {verdict: Verdict}) {
	return (
		<details>
			<summary>
				{verdict.label} — {verdict.confidence} confidence, {pluralized(verdict.matchCount, 'matching name')}
			</summary>
			<ul>
				{verdict.exampleNames.map((name) => (
					<li key={name}>{name}</li>
				))}
			</ul>
		</details>
	);
}

function DetectionDetails({result}: {result: DetectionResult}) {
	return (
		<div className="panel-hole">
			<p className="panel-hole-inner">
				<strong>{verdictSummary(result)}</strong>
			</p>

			{result.verdicts.map((verdict) => (
				<VerdictBreakdown key={verdict.source} verdict={verdict} />
			))}

			{result.unknownNames.length > 0 ? (
				<details>
					<summary>Unknown names ({result.unknownNames.length})</summary>
					<ul>
						{result.unknownNames.map(({name, prefixHint}) => (
							<li key={name}>
								{name}
								{prefixHint === undefined ? null : ` — likely ${prefixHint} (name prefix)`}
							</li>
						))}
					</ul>
				</details>
			) : null}

			{result.warnings.map((warning) => (
				<p key={warning} className="panel alert-warning" role="alert">
					⚠ {warning}
				</p>
			))}
		</div>
	);
}

const ModDetectionPanelComponent = ({blueprint}: ModDetectionPanelProps) => {
	const databaseQuery = useQuery({
		queryKey: ['mod-db'],
		staleTime: Infinity,
		enabled: blueprint !== undefined,
		queryFn: async () => import('../../../../generated/mod-db.json'),
	});

	if (blueprint === undefined || databaseQuery.isError) {
		return null;
	}
	if (databaseQuery.isPending) {
		return (
			<Panel title="Mod Detection">
				<div className="panel-hole">
					<div className="panel-hole-inner">Checking mod requirements…</div>
				</div>
			</Panel>
		);
	}

	const database: ModDatabase = databaseQuery.data.default;
	const result = classify(extractNames(blueprint), database);

	return (
		<Panel title="Mod Detection">
			<DetectionDetails result={result} />
		</Panel>
	);
};

ModDetectionPanelComponent.displayName = 'ModDetectionPanel';
export const ModDetectionPanel = memo(ModDetectionPanelComponent);
