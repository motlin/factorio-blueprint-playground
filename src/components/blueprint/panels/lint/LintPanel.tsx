import {memo, useMemo} from 'react';

import {lintBlueprint} from '../../../../lint/engine';
import type {LintFinding, LintSeverity} from '../../../../lint/types';
import type {BlueprintString, Entity} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {Panel} from '../../../ui/Panel';

import styles from './LintPanel.module.css';

interface LintPanelProps {
	blueprint: BlueprintString;
}

const SEVERITY_ORDER: Record<LintSeverity, number> = {error: 0, warning: 1, info: 2};

function firstEntityNumber(finding: LintFinding): number {
	return finding.entityNumbers[0] ?? Number.MAX_SAFE_INTEGER;
}

function sortFindings(findings: LintFinding[]): LintFinding[] {
	return [...findings].sort((first, second) => {
		const severityDifference = SEVERITY_ORDER[first.severity] - SEVERITY_ORDER[second.severity];
		if (severityDifference !== 0) return severityDifference;
		const ruleDifference = first.ruleId.localeCompare(second.ruleId);
		if (ruleDifference !== 0) return ruleDifference;
		return firstEntityNumber(first) - firstEntityNumber(second);
	});
}

function severityCounts(findings: LintFinding[]): {severity: LintSeverity; count: number}[] {
	return (['error', 'warning', 'info'] as const).flatMap((severity) => {
		const count = findings.filter((finding) => finding.severity === severity).length;
		return count === 0 ? [] : [{severity, count}];
	});
}

function countLabel(severity: LintSeverity, count: number): string {
	if (severity === 'info') return `${count} info`;
	return `${count} ${severity}${count === 1 ? '' : 's'}`;
}

function entityPosition(entity: Entity | undefined): string | undefined {
	return entity ? `(${entity.position.x}, ${entity.position.y})` : undefined;
}

const LintPanelComponent = ({blueprint}: LintPanelProps) => {
	const findings = useMemo(() => sortFindings(lintBlueprint(blueprint)), [blueprint]);
	const entityByNumber = useMemo(
		() => new Map(blueprint.blueprint?.entities?.map((entity) => [entity.entity_number, entity]) ?? []),
		[blueprint],
	);

	if (!blueprint.blueprint || findings.length === 0) return null;

	return (
		<Panel title="Lint">
			<div className={styles.summary}>
				{severityCounts(findings).map(({severity, count}) => (
					<span key={severity} data-testid="lint-count" className={`${styles.count} ${styles[severity]}`}>
						{countLabel(severity, count)}
					</span>
				))}
			</div>
			<ul className={styles.findings}>
				{findings.map((finding) => {
					const entity = entityByNumber.get(firstEntityNumber(finding));
					const position = entityPosition(entity);
					return (
						<li key={`${finding.ruleId}-${finding.entityNumbers.join(',')}`} className={styles.finding}>
							<span aria-hidden="true" className={`${styles.severity} ${styles[finding.severity]}`}>
								●
							</span>
							<span className={styles.icon}>
								<FactorioIcon
									size="small"
									icon={
										entity
											? {type: 'entity', name: entity.name, quality: entity.quality}
											: undefined
									}
								/>
							</span>
							<span>{finding.message}</span>
							{position === undefined ? null : <span className={styles.position}>{position}</span>}
						</li>
					);
				})}
			</ul>
		</Panel>
	);
};

LintPanelComponent.displayName = 'LintPanel';
export const LintPanel = memo(LintPanelComponent);
