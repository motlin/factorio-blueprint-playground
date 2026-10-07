import {memo, useEffect, useState} from 'react';

import {runLint} from '../../../../lint/lintClient';
import type {LocatedLintFinding} from '../../../../lint/lintProtocol';
import type {LintFinding, LintSeverity} from '../../../../lint/types';
import type {BlueprintString} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {RichText} from '../../../core/text/RichText';
import {Panel} from '../../../ui/Panel';

import styles from './LintPanel.module.css';

interface LintPanelProps {
	blueprint: BlueprintString;
	selectedPath?: string;
	onSelect?: (path: string) => void;
}

const SEVERITY_ORDER: Record<LintSeverity, number> = {error: 0, warning: 1, info: 2, good: 3};

// Megabase blueprints can produce over 100,000 findings; rendering them all hangs the page.
const MAXIMUM_LISTED_FINDINGS = 100;

function firstEntityNumber(finding: LintFinding): number {
	return finding.entityNumbers[0] ?? Number.MAX_SAFE_INTEGER;
}

// Keeps each blueprint's findings together, in book order, with the most severe first.
function sortFindings(findings: LocatedLintFinding[]): LocatedLintFinding[] {
	const pathOrder = new Map<string, number>();
	for (const finding of findings) {
		if (!pathOrder.has(finding.path)) pathOrder.set(finding.path, pathOrder.size);
	}
	return [...findings].sort((first, second) => {
		const pathDifference = (pathOrder.get(first.path) ?? 0) - (pathOrder.get(second.path) ?? 0);
		if (pathDifference !== 0) return pathDifference;
		const severityDifference = SEVERITY_ORDER[first.severity] - SEVERITY_ORDER[second.severity];
		if (severityDifference !== 0) return severityDifference;
		const ruleDifference = first.ruleId.localeCompare(second.ruleId);
		if (ruleDifference !== 0) return ruleDifference;
		return firstEntityNumber(first) - firstEntityNumber(second);
	});
}

function severityCounts(findings: LintFinding[]): {severity: LintSeverity; count: number}[] {
	return (['error', 'warning', 'info', 'good'] as const).flatMap((severity) => {
		const count = findings.filter((finding) => finding.severity === severity).length;
		return count === 0 ? [] : [{severity, count}];
	});
}

function countLabel(severity: LintSeverity, count: number): string {
	if (severity === 'info' || severity === 'good') return `${count} ${severity}`;
	return `${count} ${severity}${count === 1 ? '' : 's'}`;
}

function entityPosition(entity: LocatedLintFinding['entity']): string | undefined {
	return entity ? `(${entity.position.x}, ${entity.position.y})` : undefined;
}

function groupByPath(findings: LocatedLintFinding[]): LocatedLintFinding[][] {
	const groups: LocatedLintFinding[][] = [];
	for (const finding of findings) {
		const group = groups.at(-1);
		if (group?.[0]?.path === finding.path) {
			group.push(finding);
		} else {
			groups.push([finding]);
		}
	}
	return groups;
}

function absolutePath(selectedPath: string | undefined, path: string): string {
	return selectedPath === undefined || selectedPath === '' ? path : `${selectedPath}.${path}`;
}

type LintResult = {findings: LocatedLintFinding[]} | {error: string};

// Results are tagged with their blueprint so a slow answer for a previous selection is never shown.
function useLintResult(blueprint: BlueprintString): LintResult | undefined {
	const [settled, setSettled] = useState<{blueprint: BlueprintString; result: LintResult}>();

	useEffect(() => {
		if (!blueprint.blueprint && !blueprint.blueprint_book) return undefined;
		const controller = new AbortController();
		runLint(blueprint, controller.signal).then(
			(findings) => {
				setSettled({blueprint, result: {findings: sortFindings(findings)}});
			},
			(error: unknown) => {
				if (controller.signal.aborted) return;
				setSettled({blueprint, result: {error: error instanceof Error ? error.message : String(error)}});
			},
		);
		return () => {
			controller.abort();
		};
	}, [blueprint]);

	return settled?.blueprint === blueprint ? settled.result : undefined;
}

function FindingRow({finding}: {finding: LocatedLintFinding}) {
	const position = entityPosition(finding.entity);
	return (
		<li className={styles.finding}>
			<span aria-hidden="true" className={`${styles.severity} ${styles[finding.severity]}`}>
				{finding.severity === 'good' ? '✓' : '●'}
			</span>
			<span className={styles.icon}>
				<FactorioIcon
					size="small"
					icon={
						finding.entity
							? {type: 'entity', name: finding.entity.name, quality: finding.entity.quality}
							: undefined
					}
				/>
			</span>
			<span>{finding.message}</span>
			{position === undefined ? null : <span className={styles.position}>{position}</span>}
		</li>
	);
}

const LintPanelComponent = ({blueprint, selectedPath, onSelect}: LintPanelProps) => {
	const result = useLintResult(blueprint);

	if (!blueprint.blueprint && !blueprint.blueprint_book) return null;
	if (result === undefined) {
		return (
			<Panel title="Lint">
				<p data-testid="lint-checking" className={styles.note}>
					Checking blueprint for problems…
				</p>
			</Panel>
		);
	}
	if ('error' in result) {
		return (
			<Panel title="Lint">
				<p role="alert" className={styles.note}>
					Could not check this blueprint: {result.error}
				</p>
			</Panel>
		);
	}

	const {findings} = result;
	if (findings.length === 0) return null;

	return (
		<Panel title="Lint">
			<div className={styles.summary}>
				{severityCounts(findings).map(({severity, count}) => (
					<span key={severity} data-testid="lint-count" className={`${styles.count} ${styles[severity]}`}>
						{countLabel(severity, count)}
					</span>
				))}
			</div>
			{groupByPath(findings.slice(0, MAXIMUM_LISTED_FINDINGS)).map((group) => {
				const {path, blueprintLabel} = group[0];
				const target = absolutePath(selectedPath, path);
				return (
					<section key={path} className={styles.group}>
						{path === '' ? null : (
							<button
								type="button"
								className={styles.path}
								aria-label={`Select blueprint ${target}`}
								onClick={() => onSelect?.(target)}
							>
								{target}
								{blueprintLabel === undefined ? null : (
									<>
										{' '}
										<RichText text={blueprintLabel} iconSize="small" />
									</>
								)}
							</button>
						)}
						<ul className={styles.findings}>
							{group.map((finding) => (
								<FindingRow
									key={`${finding.ruleId}-${finding.entityNumbers.join(',')}`}
									finding={finding}
								/>
							))}
						</ul>
					</section>
				);
			})}
			{findings.length > MAXIMUM_LISTED_FINDINGS ? (
				<p data-testid="lint-truncated" className={styles.note}>
					Showing the first {MAXIMUM_LISTED_FINDINGS} of {findings.length.toLocaleString()} findings.
				</p>
			) : null}
		</Panel>
	);
};

LintPanelComponent.displayName = 'LintPanel';
export const LintPanel = memo(LintPanelComponent);
