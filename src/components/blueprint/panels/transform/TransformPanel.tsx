import {useNavigate} from '@tanstack/react-router';
import {useEffect, useMemo, useState} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {analyzeMetadataSubstitution, applyMetadataSubstitution} from '../../../../transform/metadataSubstitution';
import {stripQuality, stripTiles, stripTrains, stripWires} from '../../../../transform/strip';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	upgradeRuleKey,
	type UpgradePlannerSource,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Panel} from '../../../ui/Panel';
import {Textarea} from '../../../ui/Textarea';
import {ExportActions} from '../../export/ExportActions';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

interface ResolvedRules {
	error: string | undefined;
	rules: UpgradeRule[];
}

function resolveRules(source: string, plannerInput: string, planners: UpgradePlannerSource[]): ResolvedRules {
	try {
		if (source === 'suggested-upgrade') {
			return {error: undefined, rules: builtInUpgradeRules('upgrade')};
		}
		if (source === 'suggested-downgrade') {
			return {error: undefined, rules: builtInUpgradeRules('downgrade')};
		}
		if (source === 'pasted') {
			return {error: undefined, rules: rulesFromUpgradePlanner(parseUpgradePlanner(plannerInput))};
		}
		const path = source.slice('book:'.length);
		const planner = planners.find((candidate) => candidate.path === path);
		if (planner === undefined) {
			throw new Error('The selected upgrade planner is no longer in this book.');
		}
		return {error: undefined, rules: rulesFromUpgradePlanner(planner.planner)};
	} catch (error) {
		return {error: error instanceof Error ? error.message : String(error), rules: []};
	}
}

function signalLabel(rule: UpgradeRule, side: 'from' | 'to'): string {
	const signal = rule[side];
	return signal.quality === undefined || signal.quality === 'normal'
		? signal.name
		: `${signal.name} (${signal.quality})`;
}

export function TransformPanel({blueprint, rootBlueprint = blueprint, selectedPath = ''}: TransformPanelProps) {
	const navigate = useNavigate();
	const [stripQualitySelected, setStripQualitySelected] = useState(false);
	const [stripWiresSelected, setStripWiresSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
	const [result, setResult] = useState<BlueprintString>();
	const planners = useMemo(
		() => (rootBlueprint === undefined ? [] : findUpgradePlanners(rootBlueprint)),
		[rootBlueprint],
	);
	const [upgradeSource, setUpgradeSource] = useState(() =>
		blueprint?.upgrade_planner === undefined ? 'suggested-upgrade' : `book:${selectedPath}`,
	);
	const [plannerInput, setPlannerInput] = useState('');
	const [upgradeScope, setUpgradeScope] = useState<'selection' | 'root'>(() =>
		blueprint?.upgrade_planner === undefined ? 'selection' : 'root',
	);
	const [excludedRules, setExcludedRules] = useState<Set<string>>(() => new Set());
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');
	const [metadataMatchCase, setMetadataMatchCase] = useState(false);

	useEffect(() => {
		setResult(undefined);
	}, [blueprint]);

	if (blueprint === undefined) {
		return null;
	}

	const type = new BlueprintWrapper(blueprint).getType();
	if (type === 'deconstruction-planner') {
		return null;
	}
	const upgradeTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = resolveRules(upgradeSource, plannerInput, planners);
	const candidates = upgradeTarget === undefined ? [] : analyzeUpgradeRules(upgradeTarget, resolvedRules.rules);
	const selectedCandidates = candidates.filter((candidate) => !excludedRules.has(upgradeRuleKey(candidate)));
	const upgradeReplacementCount = selectedCandidates.reduce((total, candidate) => total + candidate.count, 0);
	const metadataSubstitution = {find: metadataFind, replace: metadataReplace, matchCase: metadataMatchCase};
	const metadataReplacementCount =
		upgradeTarget === undefined || metadataFind === ''
			? 0
			: analyzeMetadataSubstitution(upgradeTarget, metadataSubstitution);
	const replacementCount = upgradeReplacementCount + metadataReplacementCount;
	const canChooseRootScope = rootBlueprint?.blueprint_book !== undefined && selectedPath !== '';
	const emptyMessage =
		type === 'upgrade-planner' && rootBlueprint?.blueprint_book === undefined
			? 'This planner has no target. Open a blueprint or book and choose Pasted upgrade planner.'
			: 'No matching entities or modules in this scope.';

	const applyToSelection = (transform: (selected: BlueprintString) => BlueprintString) => {
		if (rootBlueprint === undefined) {
			throw new Error('Cannot apply a transformation without a root blueprint');
		}

		const transformed = updateNestedBlueprint(rootBlueprint, selectedPath, transform);
		if (transformed === null) {
			throw new Error(`Cannot apply a transformation at path ${selectedPath}`);
		}
		setResult(transformed);
	};
	const applyUpgrades = () => {
		const rules = selectedCandidates.map(({from, preserveQuality, to}) => ({from, preserveQuality, to}));
		const transform = (target: BlueprintString) => {
			const substituted = metadataFind === '' ? target : applyMetadataSubstitution(target, metadataSubstitution);
			return applyUpgradeRules(substituted, rules);
		};
		if (upgradeScope === 'root') {
			if (rootBlueprint === undefined) {
				throw new Error('Cannot apply an upgrade planner without a root blueprint');
			}
			setResult(transform(rootBlueprint));
			return;
		}
		applyToSelection(transform);
	};
	const applyStrips = () => {
		applyToSelection((selected) => {
			let transformedBlueprint = selected;
			if (stripQualitySelected) transformedBlueprint = stripQuality(transformedBlueprint);
			if (stripWiresSelected) transformedBlueprint = stripWires(transformedBlueprint);
			if (stripTrainsSelected) transformedBlueprint = stripTrains(transformedBlueprint);
			if (stripTilesSelected) transformedBlueprint = stripTiles(transformedBlueprint);
			return transformedBlueprint;
		});
	};
	const hasSelectedStrip = stripQualitySelected || stripWiresSelected || stripTrainsSelected || stripTilesSelected;

	const openInPlayground = () => {
		if (result === undefined) {
			throw new Error('Cannot open a transformation before applying it');
		}

		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(result),
				selection: selectedPath,
			},
		});
	};

	return (
		<>
			<Panel title="Transform">
				<div className="panel-hole upgrade-workflow">
					<div className="panel-hole-inner upgrade-workflow__controls">
						<label htmlFor="upgrade-source">Replacement source</label>
						<select
							id="upgrade-source"
							value={upgradeSource}
							onChange={(event) => {
								setUpgradeSource(event.currentTarget.value);
								setExcludedRules(new Set());
							}}
						>
							<option value="suggested-upgrade">Suggested upgrades</option>
							<option value="suggested-downgrade">Suggested downgrades</option>
							{planners.map((planner) => (
								<option key={planner.path} value={`book:${planner.path}`}>
									{planner.label}
								</option>
							))}
							<option value="pasted">Pasted upgrade planner</option>
						</select>

						{canChooseRootScope ? (
							<>
								<label htmlFor="upgrade-scope">Apply to</label>
								<select
									id="upgrade-scope"
									value={upgradeScope}
									onChange={(event) => {
										setUpgradeScope(event.currentTarget.value === 'root' ? 'root' : 'selection');
										setExcludedRules(new Set());
									}}
								>
									<option value="selection" disabled={type === 'upgrade-planner'}>
										This selection
									</option>
									<option value="root">Entire root book</option>
								</select>
							</>
						) : null}
					</div>

					{upgradeSource === 'pasted' ? (
						<div className="upgrade-workflow__planner-input">
							<Textarea
								value={plannerInput}
								onChange={(value) => {
									setPlannerInput(value);
									setExcludedRules(new Set());
								}}
								placeholder="Paste an upgrade planner string or JSON"
								rows={3}
							/>
						</div>
					) : null}

					{resolvedRules.error === undefined ? null : (
						<p className="panel alert alert-error upgrade-workflow__error" role="alert">
							{resolvedRules.error}
						</p>
					)}

					<div className="upgrade-workflow__mappings">
						{candidates.length === 0 && resolvedRules.error === undefined ? (
							<p className="upgrade-workflow__empty">{emptyMessage}</p>
						) : (
							candidates.map((candidate) => {
								const key = upgradeRuleKey(candidate);
								const label = `Replace ${signalLabel(candidate, 'from')} with ${signalLabel(candidate, 'to')}`;
								return (
									<label key={key} className="upgrade-workflow__mapping">
										<input
											type="checkbox"
											aria-label={label}
											checked={!excludedRules.has(key)}
											onChange={(event) => {
												const checked = event.currentTarget.checked;
												setExcludedRules((current) => {
													const next = new Set(current);
													if (checked) next.delete(key);
													else next.add(key);
													return next;
												});
											}}
										/>
										<code>{signalLabel(candidate, 'from')}</code>
										<span aria-hidden="true">→</span>
										<code>{signalLabel(candidate, 'to')}</code>
										<strong>{candidate.count}</strong>
									</label>
								);
							})
						)}
					</div>

					<div className="upgrade-workflow__metadata">
						<strong>Titles, descriptions, and icons</strong>
						<div className="upgrade-workflow__metadata-fields">
							<label htmlFor="metadata-find">Find</label>
							<input
								id="metadata-find"
								type="text"
								value={metadataFind}
								onChange={(event) => {
									setMetadataFind(event.currentTarget.value);
								}}
							/>
							<label htmlFor="metadata-replace">Replace with</label>
							<input
								id="metadata-replace"
								type="text"
								value={metadataReplace}
								onChange={(event) => {
									setMetadataReplace(event.currentTarget.value);
								}}
							/>
						</div>
						<label className="upgrade-workflow__metadata-case">
							<input
								type="checkbox"
								checked={metadataMatchCase}
								onChange={(event) => {
									setMetadataMatchCase(event.currentTarget.checked);
								}}
							/>{' '}
							Match case
						</label>
						{metadataFind === '' ? null : (
							<span className="upgrade-workflow__metadata-count">
								{metadataReplacementCount} metadata{' '}
								{metadataReplacementCount === 1 ? 'match' : 'matches'}
							</span>
						)}
					</div>

					<div className="upgrade-workflow__apply">
						<ButtonGreen
							disabled={replacementCount === 0 || resolvedRules.error !== undefined}
							onClick={(event) => {
								event.preventDefault();
								applyUpgrades();
							}}
						>
							Apply {replacementCount} {replacementCount === 1 ? 'replacement' : 'replacements'}
						</ButtonGreen>
					</div>
				</div>

				{type === 'upgrade-planner' ? null : (
					<div>
						<div className="mt12">
							<label>
								<input
									type="checkbox"
									checked={stripQualitySelected}
									onChange={(event) => {
										setStripQualitySelected(event.currentTarget.checked);
									}}
								/>{' '}
								Strip quality
							</label>
							<br />
							<label>
								<input
									type="checkbox"
									checked={stripWiresSelected}
									onChange={(event) => {
										setStripWiresSelected(event.currentTarget.checked);
									}}
								/>{' '}
								Strip wires
							</label>
							<br />
							<label>
								<input
									type="checkbox"
									checked={stripTrainsSelected}
									onChange={(event) => {
										setStripTrainsSelected(event.currentTarget.checked);
									}}
								/>{' '}
								Strip trains
							</label>
							<br />
							<label>
								<input
									type="checkbox"
									checked={stripTilesSelected}
									onChange={(event) => {
										setStripTilesSelected(event.currentTarget.checked);
									}}
								/>{' '}
								Strip tiles
							</label>
						</div>
						<div className="mt12">
							<ButtonGreen
								disabled={!hasSelectedStrip}
								onClick={(event) => {
									event.preventDefault();
									applyStrips();
								}}
							>
								Apply Strips
							</ButtonGreen>
						</div>
					</div>
				)}
				{type === 'blueprint-book' ? (
					<div className="flex-space-between mt12">
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								applyToSelection(flattenBook);
							}}
						>
							Flatten Book
						</ButtonGreen>
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								applyToSelection(sortBookByLabel);
							}}
						>
							Sort Book by Label
						</ButtonGreen>
					</div>
				) : null}
			</Panel>

			{result === undefined ? null : (
				<>
					<ExportActions blueprint={result} title="Transformed Blueprint" />
					<Panel>
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								openInPlayground();
							}}
						>
							Open in Playground
						</ButtonGreen>
					</Panel>
				</>
			)}
		</>
	);
}
