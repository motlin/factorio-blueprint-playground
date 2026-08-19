import type {ComponentProps} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {
	UpgradeMappingGrid,
	type PositionedUpgradeCandidate,
} from '../../src/components/blueprint/panels/transform/UpgradeMappingGrid';
import type {UpgradeRule} from '../../src/transform/upgradePlanner';

const beltMapping: PositionedUpgradeCandidate = {
	count: 4,
	from: {type: 'entity', name: 'transport-belt'},
	preserveQuality: true,
	slotIndex: 0,
	to: {type: 'entity', name: 'fast-transport-belt'},
};
const moduleMapping: PositionedUpgradeCandidate = {
	count: 0,
	from: {type: 'item', name: 'speed-module'},
	preserveQuality: true,
	slotIndex: 5,
	to: {type: 'item', name: 'speed-module-2'},
};
const inserterMapping: PositionedUpgradeCandidate = {
	count: 1,
	from: {type: 'entity', name: 'inserter', quality: 'rare'},
	preserveQuality: false,
	slotIndex: 2,
	to: {type: 'entity', name: 'fast-inserter', quality: 'epic'},
};

const emptyCallback = vi.fn<() => void>();

interface RenderGridOptions {
	candidates?: readonly PositionedUpgradeCandidate[];
	draftSlotIndex?: number;
	draftSource?: ComponentProps<typeof UpgradeMappingGrid>['draftSource'];
	excludedSources?: ReadonlySet<string>;
	manualRules?: readonly UpgradeRule[];
	onDraftRemove?: () => void;
	onDraftSourceChoose?: (slotIndex: number) => void;
	onDraftTargetChoose?: () => void;
	onRemove?: ComponentProps<typeof UpgradeMappingGrid>['onRemove'];
	onSourceChoose?: ComponentProps<typeof UpgradeMappingGrid>['onSourceChoose'];
	onTargetChoose?: ComponentProps<typeof UpgradeMappingGrid>['onTargetChoose'];
}

function renderGrid({
	candidates = [beltMapping, moduleMapping, inserterMapping],
	draftSlotIndex,
	draftSource,
	excludedSources = new Set<string>(),
	manualRules = [moduleMapping],
	onDraftRemove = emptyCallback,
	onDraftSourceChoose = vi.fn<(slotIndex: number) => void>(),
	onDraftTargetChoose = emptyCallback,
	onRemove = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onRemove']>(),
	onSourceChoose = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onSourceChoose']>(),
	onTargetChoose = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onTargetChoose']>(),
}: RenderGridOptions = {}) {
	return render(
		<UpgradeMappingGrid
			candidates={candidates}
			draftSlotIndex={draftSlotIndex}
			draftSource={draftSource}
			excludedSources={excludedSources}
			manualRules={manualRules}
			onDraftRemove={onDraftRemove}
			onDraftSourceChoose={onDraftSourceChoose}
			onDraftTargetChoose={onDraftTargetChoose}
			onRemove={onRemove}
			onSourceChoose={onSourceChoose}
			onTargetChoose={onTargetChoose}
		/>,
	);
}

describe('UpgradeMappingGrid', () => {
	test('renders the Factorio four-pair by four-row minimum grid and preserves slot positions', () => {
		renderGrid();

		const mappingRows = [...document.querySelectorAll<HTMLElement>('[data-mapping-key]')];
		expect({
			headings: screen.getAllByText(/^(From|To)$/).map((heading) => heading.textContent),
			mappings: mappingRows.map((row) => ({
				key: row.getAttribute('data-mapping-key'),
				slot: [...(row.parentElement?.children ?? [])].indexOf(row),
				title: row.title,
			})),
			slotCount: screen.getAllByRole('listitem').length,
		}).toStrictEqual({
			headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
			mappings: [
				{
					key: 'entity:transport-belt:normal:=',
					slot: 0,
					title: 'Transport belt → Fast transport belt',
				},
				{
					key: 'entity:inserter:rare:=',
					slot: 2,
					title: 'Inserter → Fast inserter',
				},
				{
					key: 'item:speed-module:normal:=',
					slot: 5,
					title: 'Speed module → Speed module 2',
				},
			],
			slotCount: 16,
		});
	});

	test('reports source, target, removal, and empty-slot actions exactly', async () => {
		const user = userEvent.setup();
		const onDraftRemove = vi.fn<() => void>();
		const onDraftSourceChoose = vi.fn<(slotIndex: number) => void>();
		const onDraftTargetChoose = vi.fn<() => void>();
		const onRemove = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onRemove']>();
		const onSourceChoose = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onSourceChoose']>();
		const onTargetChoose = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onTargetChoose']>();
		renderGrid({
			draftSlotIndex: 4,
			draftSource: {type: 'entity', name: 'assembling-machine-2', quality: 'rare', comparator: '≤'},
			onDraftRemove,
			onDraftSourceChoose,
			onDraftTargetChoose,
			onRemove,
			onSourceChoose,
			onTargetChoose,
		});

		await user.click(screen.getByRole('button', {name: 'Choose source, currently Speed module'}));
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		const draftSource = screen.getByRole('button', {name: 'Choose source, currently Assembling machine 2'});
		await user.click(draftSource);
		await user.click(screen.getByRole('button', {name: 'Choose target for Assembling machine 2'}));
		fireEvent.contextMenu(draftSource);
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose target for Speed module'}));

		expect({
			draftRemove: onDraftRemove.mock.calls,
			draftSource: onDraftSourceChoose.mock.calls,
			draftTarget: onDraftTargetChoose.mock.calls,
			remove: onRemove.mock.calls,
			source: onSourceChoose.mock.calls,
			target: onTargetChoose.mock.calls,
		}).toStrictEqual({
			draftRemove: [[]],
			draftSource: [[4]],
			draftTarget: [[]],
			remove: [[moduleMapping, true]],
			source: [[moduleMapping]],
			target: [[beltMapping]],
		});
	});
});
