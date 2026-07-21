import {useQuery} from '@tanstack/react-query';
import {memo} from 'react';

import {classify} from '../../../../parsing/modDetection/classify';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {Confidence, DetectionResult, ModDatabase, Verdict} from '../../../../parsing/modDetection/types';
import type {BlueprintString} from '../../../../parsing/types';
import {Panel} from '../../../ui/Panel';

const DLC_SOURCE_IDS = new Set(['space-age', 'quality', 'elevated-rails']);
const EDITOR_SOURCE_IDS = new Set(['map-editor', 'space-age-map-editor']);

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
		(verdict) =>
			verdict.source !== 'base' && verdict.source !== 'base-1.1' && !EDITOR_SOURCE_IDS.has(verdict.source),
	);
	const editorVerdicts = result.verdicts.filter((verdict) => EDITOR_SOURCE_IDS.has(verdict.source));
	const parts: string[] = [];

	if (requiredVerdicts.length > 0) {
		const labels = requiredVerdicts.map((verdict) => verdict.label).join(' + ');
		if (requiredVerdicts.every((verdict) => DLC_SOURCE_IDS.has(verdict.source))) {
			parts.push(`Requires ${labels}`);
		} else {
			const matchCount = requiredVerdicts.reduce((total, verdict) => total + verdict.matchCount, 0);
			parts.push(
				`Requires ${labels} — ${overallConfidence(requiredVerdicts)} confidence, ${pluralized(matchCount, 'matching name')}`,
			);
		}
	}

	if (editorVerdicts.length > 0) {
		const hasBaseEditor = editorVerdicts.some((verdict) => verdict.source === 'map-editor');
		const hasSpaceAgeEditor = editorVerdicts.some((verdict) => verdict.source === 'space-age-map-editor');
		if (hasBaseEditor && hasSpaceAgeEditor) {
			parts.push('Contains base + Space Age map editor entities');
		} else if (hasSpaceAgeEditor) {
			parts.push('Contains Space Age map editor entities');
		} else {
			parts.push('Contains map editor entities');
		}
	}

	if (result.unknownNames.length > 0) {
		parts.push(`Likely modded — ${pluralized(result.unknownNames.length, 'unknown name')}`);
	}

	if (parts.length > 0) {
		return parts.join(' · ');
	}

	return result.verdicts.some((verdict) => verdict.source === 'base-1.1') ? 'Vanilla 1.1' : 'Vanilla 2.0';
}

function VerdictBreakdown({verdict}: {verdict: Verdict}) {
	const isEditor = EDITOR_SOURCE_IDS.has(verdict.source);
	return (
		<details className="mod-detection__source">
			<summary className="mod-detection__source-summary">
				<span className="mod-detection__chevron" aria-hidden="true" />
				<span className="mod-detection__source-label">{verdict.label}</span>
				<span className="mod-detection__source-facts">
					{isEditor ? <span className="mod-detection__tag mod-detection__tag--editor">Editor</span> : null}
					<span className="mod-detection__tag">{verdict.confidence} confidence</span>
					<span className="mod-detection__count">{pluralized(verdict.matchCount, 'matching name')}</span>
				</span>
			</summary>
			<ul className="mod-detection__names">
				{verdict.exampleNames.map((name) => (
					<li key={name}>
						<code>{name}</code>
					</li>
				))}
			</ul>
		</details>
	);
}

function DetectionDetails({result}: {result: DetectionResult}) {
	const hasRequirements = result.verdicts.some(
		(verdict) => verdict.source !== 'base' && verdict.source !== 'base-1.1',
	);
	const statusTone = result.unknownNames.length > 0 ? 'warning' : hasRequirements ? 'detected' : 'vanilla';
	return (
		<div className="panel-hole mod-detection">
			<div className="panel-hole-inner mod-detection__headline">
				<span
					className={`mod-detection__status-light mod-detection__status-light--${statusTone}`}
					aria-hidden="true"
				/>
				<div>
					<span className="mod-detection__eyebrow">Blueprint requirements</span>
					<strong>{verdictSummary(result)}</strong>
				</div>
			</div>

			<div className="mod-detection__sources">
				{result.verdicts.map((verdict) => (
					<VerdictBreakdown key={verdict.source} verdict={verdict} />
				))}

				{result.unknownNames.length > 0 ? (
					<details className="mod-detection__source mod-detection__source--warning">
						<summary className="mod-detection__source-summary">
							<span className="mod-detection__chevron" aria-hidden="true" />
							<span className="mod-detection__source-label">Unknown names</span>
							<span className="mod-detection__count">
								{pluralized(result.unknownNames.length, 'name')}
							</span>
						</summary>
						<ul className="mod-detection__names">
							{result.unknownNames.map(({name, prefixHint}) => (
								<li key={name}>
									<code>{name}</code>
									{prefixHint === undefined ? null : (
										<span className="mod-detection__hint">
											Likely {prefixHint} from the name prefix
										</span>
									)}
								</li>
							))}
						</ul>
					</details>
				) : null}
			</div>

			{result.warnings.map((warning) => (
				<p key={warning} className="panel alert-warning mod-detection__warning" role="alert">
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
				<div className="panel-hole mod-detection">
					<div className="panel-hole-inner mod-detection__loading">Checking mod requirements…</div>
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
