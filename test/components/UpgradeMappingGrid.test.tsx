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

function sequentialMappings(count: number): PositionedUpgradeMapping[] {
	return Array.from({length: count}, (_, slotIndex) => ({
		count: slotIndex + 1,
		from: {type: 'entity', name: 'transport-belt'},
		mappingId: `mapping-${(slotIndex + 1).toString()}`,
		slotIndex,
		to: {type: 'entity', name: 'fast-transport-belt'},
	}));
}

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
	test('uses the source-derived four-column table and grows by one padded row after content', () => {
		const layouts = [0, 1, 4, 5, 16, 17].map((mappingCount) => {
			const {unmount} = renderGrid({mappings: sequentialMappings(mappingCount)});
			const grid = screen.getByRole('group', {name: 'From and To mappings'});
			const table = grid.querySelector<HTMLElement>('.upgrade-mapping-grid__table');
			if (table === null) {
				throw new Error('Expected the upgrade mapping table.');
			}
			const slotCount = within(grid).getAllByRole('listitem').length;
			const layout = {
				columns: table.dataset.factorioColumns,
				emptySlotCount: slotCount - mappingCount,
				headings: screen.getAllByText(/^(From|To)$/).map((heading) => heading.textContent),
				mappingCount,
				minimumRows: table.dataset.factorioMinimumRows,
				rowCount: slotCount / 4,
				slotCount,
				source: grid.dataset.factorioSource,
				style: table.dataset.factorioStyle,
				styleVariables: grid.getAttribute('style'),
			};
			unmount();
			return layout;
		});

		expect(layouts).toStrictEqual([
			{
				columns: '4',
				emptySlotCount: 16,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 0,
				minimumRows: '4',
				rowCount: 4,
				slotCount: 16,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
			{
				columns: '4',
				emptySlotCount: 15,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 1,
				minimumRows: '4',
				rowCount: 4,
				slotCount: 16,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
			{
				columns: '4',
				emptySlotCount: 12,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 4,
				minimumRows: '4',
				rowCount: 4,
				slotCount: 16,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
			{
				columns: '4',
				emptySlotCount: 11,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 5,
				minimumRows: '4',
				rowCount: 4,
				slotCount: 16,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
			{
				columns: '4',
				emptySlotCount: 4,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 16,
				minimumRows: '4',
				rowCount: 5,
				slotCount: 20,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
			{
				columns: '4',
				emptySlotCount: 7,
				headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
				mappingCount: 17,
				minimumRows: '4',
				rowCount: 6,
				slotCount: 24,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
				styleVariables:
					'--upgrade-mapping-first-spacing: 27px; --upgrade-mapping-pair-width: 80px; --upgrade-mapping-second-spacing: 26px; --upgrade-mapping-slot-width: 40px; --upgrade-mapping-table-width: 400px; --upgrade-mapping-third-spacing: 27px; --upgrade-mapping-vertical-spacing: 0px;',
			},
		]);
	});

	test('renders persistent complete, incomplete, and zero-match rows at stable slots', () => {
		renderGrid();

		const mappingRows = [...document.querySelectorAll<HTMLElement>('[data-mapping-key]')];
		expect({
			headings: screen.getAllByText(/^(From|To)$/).map((heading) => heading.textContent),
			mappings: mappingRows.map((row) => ({
				draggable: row.getAttribute('draggable'),
				key: row.getAttribute('data-mapping-key'),
				label: row.getAttribute('aria-label'),
				slot: [...(row.parentElement?.children ?? [])].indexOf(row),
			})),
			slotCount: screen.getAllByRole('listitem').length,
			zeroMatchSummary: within(mappingRows[2]).getByText(/0 matches/).textContent,
		}).toStrictEqual({
			headings: ['From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
			mappings: [
				{
					draggable: 'true',
					key: 'mapping-belt',
					label: 'Mapping from Transport belt to Fast transport belt',
					slot: 0,
				},
				{
					draggable: 'true',
					key: 'mapping-target-only',
					label: 'Incomplete mapping to Fast inserter',
					slot: 2,
				},
				{
					draggable: 'true',
					key: 'mapping-module',
					label: 'Mapping from Speed module to Speed module 2',
					slot: 5,
				},
			],
			slotCount: 16,
			zeroMatchSummary:
				'0 matches. Drag this From and To pair to move it, or focus either endpoint and press Control plus an arrow key. Press Delete to clear the focused endpoint.',
		});
	});

	test('routes row creation, endpoint clearing, and whole-pair drag swaps by stable identity', async () => {
		const user = userEvent.setup();
		const onChooseSource = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseSource']>();
		const onChooseTarget = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onChooseTarget']>();
		const onClearEndpoint = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onClearEndpoint']>();
		const onMove = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onMove']>();
		renderGrid({onChooseSource, onChooseTarget, onClearEndpoint, onMove});

		await user.click(screen.getAllByRole('button', {name: 'Choose source for new mapping'})[0]);
		await user.click(screen.getAllByRole('button', {name: 'Choose target for new mapping'})[0]);
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose source, currently Speed module'}));

		const dataTransfer = {
			dropEffect: 'none',
			effectAllowed: 'none',
			getData: vi.fn<(format: string) => string>(() => 'mapping-module'),
			setData: vi.fn<(format: string, data: string) => void>(),
		};
		const moduleRow = screen.getByRole('listitem', {name: 'Mapping from Speed module to Speed module 2'});
		const emptySlot = screen.getByRole('group', {name: 'Empty mapping slot 5'});
		fireEvent.dragStart(moduleRow, {dataTransfer});
		fireEvent.dragEnter(emptySlot, {dataTransfer});
		expect(emptySlot.parentElement?.getAttribute('data-drop-target')).toBe('true');
		fireEvent.dragOver(emptySlot, {dataTransfer});
		fireEvent.drop(emptySlot, {dataTransfer});

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
			dragPayload: [['application/x-factorio-upgrade-mapping', 'mapping-module']],
			move: [['mapping-module', 4]],
		});
	});

	test('moves a focused whole pair spatially with Control plus arrow keys without visible controls', async () => {
		const user = userEvent.setup();
		const onMove = vi.fn<ComponentProps<typeof UpgradeMappingGrid>['onMove']>();
		renderGrid({onMove});

		const firstSource = screen.getByRole('button', {name: 'Choose source, currently Transport belt'});
		const moduleSource = screen.getByRole('button', {name: 'Choose source, currently Speed module'});
		expect(screen.queryByRole('button', {name: /Move mapping/})).toBeNull();

		moduleSource.focus();
		await user.keyboard('{Control>}{ArrowLeft}{ArrowRight}{ArrowUp}{ArrowDown}{/Control}');
		await user.keyboard('{ArrowLeft}');
		firstSource.focus();
		await user.keyboard('{Control>}{ArrowLeft}{ArrowUp}{ArrowRight}{ArrowDown}{/Control}');

		expect({
			instructions: moduleSource.getAttribute('aria-describedby'),
			keyboardShortcuts: moduleSource.getAttribute('aria-keyshortcuts'),
			move: onMove.mock.calls,
		}).toStrictEqual({
			instructions: within(moduleSource.closest<HTMLElement>('[data-mapping-key]')!).getByText(
				/Control plus an arrow key/,
			).id,
			keyboardShortcuts:
				'Control+ArrowLeft Control+ArrowRight Control+ArrowUp Control+ArrowDown Delete Backspace',
			move: [
				['mapping-module', 4],
				['mapping-module', 6],
				['mapping-module', 1],
				['mapping-module', 9],
				['mapping-belt', 1],
				['mapping-belt', 4],
			],
		});
	});
});
