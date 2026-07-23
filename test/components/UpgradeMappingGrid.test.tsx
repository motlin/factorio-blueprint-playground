import type {ComponentProps} from 'react';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradeMappingGrid} from '../../src/components/blueprint/panels/transform/UpgradeMappingGrid';
import type {UpgradeCandidate, UpgradeRule} from '../../src/transform/upgradePlanner';

const beltMapping: UpgradeCandidate = {
	count: 4,
	from: {type: 'entity', name: 'transport-belt'},
	preserveQuality: true,
	to: {type: 'entity', name: 'fast-transport-belt'},
};
const moduleMapping: UpgradeCandidate = {
	count: 0,
	from: {type: 'item', name: 'speed-module'},
	preserveQuality: true,
	to: {type: 'item', name: 'speed-module-2'},
};
const inserterMapping: UpgradeCandidate = {
	count: 1,
	from: {type: 'entity', name: 'inserter', quality: 'rare'},
	preserveQuality: false,
	to: {type: 'entity', name: 'fast-inserter', quality: 'epic'},
};

interface RenderGridOptions {
	candidates?: readonly UpgradeCandidate[];
	excludedSources?: ReadonlySet<string>;
	manualRules?: readonly UpgradeRule[];
	onRemove?: (candidate: UpgradeCandidate, manual: boolean) => void;
	onSourceChoose?: (candidate: UpgradeCandidate) => void;
	onSourceQualityChange?: ComponentProps<typeof UpgradeMappingGrid>['onSourceQualityChange'];
	onTargetChoose?: (candidate: UpgradeCandidate) => void;
	onTargetQualityChange?: ComponentProps<typeof UpgradeMappingGrid>['onTargetQualityChange'];
}

function renderGrid({
	candidates = [beltMapping, moduleMapping, inserterMapping],
	excludedSources = new Set<string>(),
	manualRules = [moduleMapping],
	onRemove = vi.fn<(candidate: UpgradeCandidate, manual: boolean) => void>(),
	onSourceChoose = vi.fn<(candidate: UpgradeCandidate) => void>(),
	onSourceQualityChange = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onSourceQualityChange']>(),
	onTargetChoose = vi.fn<(candidate: UpgradeCandidate) => void>(),
	onTargetQualityChange = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onTargetQualityChange']>(),
}: RenderGridOptions = {}) {
	return render(
		<UpgradeMappingGrid
			candidates={candidates}
			excludedSources={excludedSources}
			manualRules={manualRules}
			onRemove={onRemove}
			onSourceChoose={onSourceChoose}
			onSourceQualityChange={onSourceQualityChange}
			onTargetChoose={onTargetChoose}
			onTargetQualityChange={onTargetQualityChange}
			showEmptyState
		/>,
	);
}

describe('UpgradeMappingGrid', () => {
	test('renders one ordered From/To grid including a loaded zero-match mapping', () => {
		renderGrid();

		const rows = screen.getAllByRole('listitem');
		expect(
			rows.map((row) => ({
				count: row.querySelector('.upgrade-mapping-grid__count')?.textContent,
				key: row.getAttribute('data-mapping-key'),
				remove: within(row)
					.getByRole('button', {name: /Remove mapping/})
					.getAttribute('aria-label'),
				source: within(row).getByRole('button', {name: /Choose source/}).title,
				target: within(row).getByRole('button', {name: /Choose target/}).title,
			})),
		).toStrictEqual([
			{
				count: '4matches',
				key: 'entity:transport-belt:normal:=',
				remove: 'Remove mapping from Transport belt',
				source: 'Transport belt\nentity:transport-belt',
				target: 'Fast transport belt\nentity:fast-transport-belt',
			},
			{
				count: '0matches',
				key: 'item:speed-module:normal:=',
				remove: 'Remove mapping from Speed module',
				source: 'Speed module\nitem:speed-module',
				target: 'Speed module 2\nitem:speed-module-2',
			},
			{
				count: '1match',
				key: 'entity:inserter:rare:=',
				remove: 'Remove mapping from Inserter',
				source: 'Inserter\nentity:inserter\nQuality: = rare',
				target: 'Fast inserter\nentity:fast-inserter\nQuality: = epic',
			},
		]);
	});

	test('uses mapping identities as keys while preserving the supplied order', () => {
		const {rerender} = renderGrid();
		const initialRows = new Map(
			screen.getAllByRole('listitem').map((row) => [row.getAttribute('data-mapping-key'), row] as const),
		);

		rerender(
			<UpgradeMappingGrid
				candidates={[inserterMapping, beltMapping, moduleMapping]}
				excludedSources={new Set()}
				manualRules={[moduleMapping]}
				onRemove={vi.fn<(candidate: UpgradeCandidate, manual: boolean) => void>()}
				onSourceChoose={vi.fn<(candidate: UpgradeCandidate) => void>()}
				onSourceQualityChange={vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onSourceQualityChange']>()}
				onTargetChoose={vi.fn<(candidate: UpgradeCandidate) => void>()}
				onTargetQualityChange={vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onTargetQualityChange']>()}
				showEmptyState
			/>,
		);

		const reorderedRows = screen.getAllByRole('listitem');
		expect({
			nodesPreserved: reorderedRows.map((row) => initialRows.get(row.getAttribute('data-mapping-key')) === row),
			orderedKeys: reorderedRows.map((row) => row.getAttribute('data-mapping-key')),
		}).toStrictEqual({
			nodesPreserved: [true, true, true],
			orderedKeys: ['entity:inserter:rare:=', 'entity:transport-belt:normal:=', 'item:speed-module:normal:='],
		});
	});

	test('reports source, target, and removal actions for the exact mapping', async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn<(candidate: UpgradeCandidate, manual: boolean) => void>();
		const onSourceChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		const onSourceQualityChange = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onSourceQualityChange']>();
		const onTargetChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		const onTargetQualityChange = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onTargetQualityChange']>();
		renderGrid({
			onRemove,
			onSourceChoose,
			onSourceQualityChange,
			onTargetChoose,
			onTargetQualityChange,
		});

		await user.click(screen.getByRole('button', {name: 'Choose source, currently Speed module'}));
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Remove mapping from Speed module'}));
		const beltRow = screen.getByRole('listitem', {name: 'Mapping from Transport belt to Fast transport belt'});
		const inserterRow = screen.getByRole('listitem', {name: 'Mapping from Inserter to Fast inserter'});
		await user.selectOptions(within(beltRow).getByRole('combobox', {name: 'Source quality selection'}), 'normal');
		await user.selectOptions(within(inserterRow).getByRole('combobox', {name: 'Quality comparison'}), '≥');
		await user.selectOptions(within(beltRow).getByRole('combobox', {name: 'Target quality selection'}), 'epic');
		await user.selectOptions(
			within(inserterRow).getByRole('combobox', {name: 'Target quality selection'}),
			'preserve',
		);

		expect({
			remove: onRemove.mock.calls,
			source: onSourceChoose.mock.calls,
			sourceQuality: onSourceQualityChange.mock.calls,
			target: onTargetChoose.mock.calls,
			targetQuality: onTargetQualityChange.mock.calls,
		}).toStrictEqual({
			remove: [[moduleMapping, true]],
			source: [[moduleMapping]],
			sourceQuality: [
				[beltMapping, {type: 'entity', name: 'transport-belt', quality: 'normal', comparator: '='}],
				[inserterMapping, {type: 'entity', name: 'inserter', quality: 'rare', comparator: '≥'}],
			],
			target: [[beltMapping]],
			targetQuality: [
				[beltMapping, {type: 'entity', name: 'fast-transport-belt', quality: 'epic'}, false],
				[inserterMapping, {type: 'entity', name: 'fast-inserter'}, true],
			],
		});
	});
});
