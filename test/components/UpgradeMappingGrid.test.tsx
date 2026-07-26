import type {ComponentProps} from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {
	UpgradeMappingGrid,
	type PositionedUpgradeMapping,
} from '../../src/components/blueprint/panels/transform/UpgradeMappingGrid';

const mappings: PositionedUpgradeMapping[] = [
	{
		count: 4,
		from: {type: 'entity', name: 'transport-belt'},
		mappingId: 'mapping-belt',
		slotIndex: 0,
		to: {type: 'entity', name: 'fast-transport-belt'},
	},
	{
		count: 0,
		from: {type: 'item', name: 'speed-module'},
		mappingId: 'mapping-module',
		slotIndex: 5,
		to: {type: 'item', name: 'speed-module-2'},
	},
	{
		count: 0,
		mappingId: 'mapping-target-only',
		slotIndex: 2,
		to: {type: 'entity', name: 'fast-inserter', quality: 'rare'},
	},
];

function renderGrid(overrides: Partial<ComponentProps<typeof UpgradeMappingGrid>> = {}) {
	const properties: ComponentProps<typeof UpgradeMappingGrid> = {
		mappings,
		onChooseSource: vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseSource']>(),
		onChooseTarget: vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseTarget']>(),
		onClearEndpoint: vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onClearEndpoint']>(),
		onMove: vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onMove']>(),
		...overrides,
	};
	return {properties, ...render(<UpgradeMappingGrid {...properties} />)};
}

describe('UpgradeMappingGrid', () => {
	test('renders persistent complete, incomplete, and zero-match rows at stable slots', () => {
		renderGrid();

		const mappingRows = [...document.querySelectorAll<HTMLElement>('[data-mapping-key]')];
		expect({
			headings: screen.getAllByText(/^(From|To)$/).map((heading) => heading.textContent),
			mappings: mappingRows.map((row) => ({
				key: row.getAttribute('data-mapping-key'),
				label: row.getAttribute('aria-label'),
				slot: [...(row.parentElement?.children ?? [])].indexOf(row),
			})),
			slotCount: screen.getAllByRole('listitem').length,
			zeroMatchSummary: within(mappingRows[2]).getByText(/0 matches/).textContent,
		}).toStrictEqual({
			headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
			mappings: [
				{key: 'mapping-belt', label: 'Mapping from Transport belt to Fast transport belt', slot: 0},
				{key: 'mapping-target-only', label: 'Incomplete mapping to Fast inserter', slot: 2},
				{key: 'mapping-module', label: 'Mapping from Speed module to Speed module 2', slot: 5},
			],
			slotCount: 16,
			zeroMatchSummary:
				'0 matches. Drag this pair or use its move buttons to reorder it. Focus an endpoint and press Delete to clear that endpoint.',
		});
	});

	test('routes row creation, endpoint clearing, drag reorder, and keyboard reorder by stable identity', async () => {
		const user = userEvent.setup();
		const onChooseSource = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseSource']>();
		const onChooseTarget = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseTarget']>();
		const onClearEndpoint = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onClearEndpoint']>();
		const onMove = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onMove']>();
		renderGrid({onChooseSource, onChooseTarget, onClearEndpoint, onMove});

		await user.click(screen.getAllByRole('button', {name: 'Choose source for new mapping'})[0]);
		await user.click(screen.getAllByRole('button', {name: 'Choose target for new mapping'})[0]);
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose source, currently Speed module'}));
		await user.click(screen.getByRole('button', {name: 'Move mapping in slot 3 earlier'}));

		const dataTransfer = {
			getData: vi.fn<(format: string) => string>(() => 'mapping-module'),
			setData: vi.fn<(format: string, data: string) => void>(),
			effectAllowed: 'none',
		};
		const moduleRow = screen.getByRole('listitem', {name: 'Mapping from Speed module to Speed module 2'});
		fireEvent.dragStart(moduleRow, {dataTransfer});
		fireEvent.drop(screen.getByRole('group', {name: 'Empty mapping slot 5'}), {dataTransfer});

		expect({
			chooseSource: onChooseSource.mock.calls,
			chooseTarget: onChooseTarget.mock.calls,
			clearEndpoint: onClearEndpoint.mock.calls,
			dragPayload: dataTransfer.setData.mock.calls,
			move: onMove.mock.calls,
		}).toStrictEqual({
			chooseSource: [[undefined, 1]],
			chooseTarget: [[undefined, 1]],
			clearEndpoint: [['mapping-module', 'from']],
			dragPayload: [['text/plain', 'mapping-module']],
			move: [
				['mapping-target-only', 1],
				['mapping-module', 4],
			],
		});
	});
});
