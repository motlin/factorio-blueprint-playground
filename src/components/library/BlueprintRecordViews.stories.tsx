import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {LIBRARY_ROOT_ID, type LibraryRecord} from '../../storage/db';
import {BlueprintRecordViews} from './BlueprintRecordViews';

function record(
	id: string,
	position: number,
	gameData: LibraryRecord['gameData'],
	parentId = LIBRARY_ROOT_ID,
): LibraryRecord {
	return {
		id,
		createdOn: position,
		updatedOn: position,
		data: `${id}-serialized-data`,
		gameData,
		parentId,
		position,
	};
}

const mixedRecords = [
	record('starter-base', 0, {
		type: 'blueprint',
		label: 'Starter base',
		description: 'Smelting, science, and mall for the early game.',
		icons: [
			{type: 'item', name: 'assembling-machine-3', quality: 'legendary'},
			{type: 'item', name: 'transport-belt'},
		],
	}),
	record('rail-book', 1, {
		type: 'blueprint_book',
		label: 'Rail network',
		description: 'A nested book of intersections and stations.',
		icons: [{type: 'item', name: 'rail'}],
	}),
	record('belt-upgrades', 2, {
		type: 'upgrade_planner',
		label: 'Belt upgrades',
		description: 'Upgrades yellow belts through express belts.',
		icons: [{type: 'item', name: 'upgrade-planner'}],
	}),
	record('cleanup', 3, {
		type: 'deconstruction_planner',
		label: 'Tree cleanup',
		description: 'Marks trees and rocks around the factory.',
		icons: [{type: 'item', name: 'deconstruction-planner'}],
	}),
] satisfies LibraryRecord[];

const meta = {
	title: 'Library/BlueprintRecordViews',
	component: BlueprintRecordViews<LibraryRecord>,
	args: {
		'aria-label': 'Blueprint records',
		compareRecords: (left, right) => left.position - right.position,
		isRecordActionable: () => true,
		onActivate: fn(),
		records: mixedRecords,
	},
	decorators: [
		(Story) => (
			<div className="blueprint-library" style={{padding: 16}}>
				<Story />
			</div>
		),
	],
	parameters: {layout: 'fullscreen'},
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintRecordViews<LibraryRecord>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedRecords: Story = {};

export const LongLabels: Story = {
	tags: ['visual-conformance'],
	args: {
		records: [
			record('long-label', 0, {
				type: 'blueprint',
				label: 'Interplanetary legendary-quality science production and rail distribution megabase sector with redundant unloading',
				description:
					'List mode keeps the complete label and wraps this description while grid mode keeps its compact two-line caption.',
				icons: [{type: 'item', name: 'space-science-pack', quality: 'legendary'}],
			}),
		],
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const recordButton = canvas.getByRole('button', {
			name: 'Interplanetary legendary-quality science production and rail distribution megabase sector with redundant unloading',
		});

		await expect(recordButton).toHaveAttribute('aria-current', 'true');
		await expect(recordButton).toHaveAttribute('data-factorio-source', 'BlueprintsList::addItem');
		await expect(recordButton.querySelector('.blueprint-record-item__icons')).toHaveAttribute(
			'data-factorio-style',
			'blueprint_record_selection_button',
		);
		await expect(recordButton.querySelector('strong')).toHaveTextContent(
			'Interplanetary legendary-quality science production and rail distribution megabase sector with redundant unloading',
		);
	},
};

export const EmptyLabels: Story = {
	args: {
		records: [
			record('untitled-blueprint', 0, {
				type: 'blueprint',
				label: '',
				description: 'An intentionally unlabeled blueprint.',
				icons: [],
			}),
			record('untitled-book', 1, {
				type: 'blueprint_book',
				description: 'An intentionally unlabeled book.',
				icons: [],
			}),
			record('untitled-planner', 2, {
				type: 'upgrade_planner',
				label: '   ',
				icons: [],
			}),
		],
	},
};

export const NestedBooks: Story = {
	args: {
		records: [
			record('regional-rail', 0, {
				type: 'blueprint_book',
				label: 'Regional rail',
				description: 'Contains the city-block book and shared stacker designs.',
				icons: [{type: 'item', name: 'blueprint-book'}],
			}),
			record(
				'city-blocks',
				1,
				{
					type: 'blueprint_book',
					label: 'City blocks',
					description: 'Nested book with production-block blueprints.',
					icons: [{type: 'item', name: 'rail-chain-signal'}],
				},
				'regional-rail',
			),
		],
	},
};

export const SavedUpgradePlanners: Story = {
	args: {
		records: [
			record('belt-planner', 0, {
				type: 'upgrade_planner',
				label: 'Belt tiers',
				description: 'Saved planner with belt, underground belt, and splitter mappings.',
				icons: [{type: 'item', name: 'upgrade-planner'}],
			}),
			record('quality-planner', 1, {
				type: 'upgrade_planner',
				label: 'Legendary assemblers',
				description: 'Saved planner that targets legendary assembling machines.',
				icons: [{type: 'item', name: 'assembling-machine-3', quality: 'legendary'}],
			}),
		],
	},
};

export const SixColumnGrid: Story = {
	tags: ['visual-conformance'],
	args: {
		records: Array.from({length: 8}, (_, index) =>
			record(`grid-blueprint-${(index + 1).toString()}`, index, {
				type: 'blueprint',
				label: `Grid blueprint ${(index + 1).toString()}`,
				description: 'A record used to verify Factorio grid geometry.',
				icons: [{type: 'item', name: index % 2 === 0 ? 'transport-belt' : 'assembling-machine-3'}],
			}),
		),
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Grid view'}));
		const recordList = canvas.getByRole('list');
		const firstRecord = canvas.getByRole('button', {name: 'Grid blueprint 1'});

		await expect(recordList).toHaveClass('blueprint-record-views__items--grid');
		await expect(recordList).toHaveAttribute('data-factorio-columns', '6');
		await expect(recordList).toHaveStyle({
			'--blueprint-record-grid-columns': '6',
			'--blueprint-record-label-height': '40px',
			'--blueprint-record-slot-size': '80px',
		});
		firstRecord.focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(canvas.getByRole('button', {name: 'Grid blueprint 7'})).toHaveFocus();
	},
};

export const TenColumnSlots: Story = {
	tags: ['visual-conformance'],
	args: {
		records: Array.from({length: 12}, (_, index) =>
			record(`slot-blueprint-${(index + 1).toString()}`, index, {
				type: 'blueprint',
				label: `Slot blueprint ${(index + 1).toString()}`,
				description: 'Secondary record details stay in the compact slot tooltip.',
				icons: [{type: 'item', name: index % 2 === 0 ? 'transport-belt' : 'assembling-machine-3'}],
			}),
		),
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Slots view'}));
		const recordList = canvas.getByRole('list');
		const firstRecord = canvas.getByRole('button', {name: 'Slot blueprint 1'});

		await expect(recordList).toHaveClass('blueprint-record-views__items--slots');
		await expect(recordList).toHaveAttribute('data-factorio-columns', '10');
		await expect(recordList).toHaveStyle({
			'--blueprint-record-small-slot-columns': '10',
			'--blueprint-record-small-slot-size': '40px',
		});
		await expect(recordList.querySelectorAll('.blueprint-record-views__empty-slot')).toHaveLength(8);
		await expect(firstRecord).toHaveAttribute('data-secondary-detail', 'tooltip');
		await expect(firstRecord.querySelector('.blueprint-record-item__text')).toBeNull();
		firstRecord.focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(canvas.getByRole('button', {name: 'Slot blueprint 11'})).toHaveFocus();
	},
};

export const ViewModeToggles: Story = {
	tags: ['visual-conformance'],
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const viewGroup = canvas.getByRole('group', {name: 'Record view'});
		const listView = within(viewGroup).getByRole('button', {name: 'List view'});
		const gridView = within(viewGroup).getByRole('button', {name: 'Grid view'});
		const slotsView = within(viewGroup).getByRole('button', {name: 'Slots view'});

		await userEvent.click(listView);
		await expect(listView).toHaveAttribute('aria-pressed', 'true');
		await expect(listView).toHaveAttribute('tabindex', '0');
		await userEvent.click(gridView);
		await expect(gridView).toHaveAttribute('aria-pressed', 'true');
		await expect(canvas.getByRole('list')).toHaveClass('blueprint-record-views__items--grid');
		slotsView.focus();
		await userEvent.keyboard('{Enter}');
		await expect(slotsView).toHaveAttribute('aria-pressed', 'true');
		await expect(canvas.getByRole('list')).toHaveClass('blueprint-record-views__items--slots');
	},
};

export const FilteredEmptyState: Story = {
	tags: ['visual-conformance'],
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const searchToggle = canvas.getByRole('button', {name: 'Search blueprint records'});

		await expect(canvas.queryByRole('searchbox')).toBeNull();
		await userEvent.click(searchToggle);
		const searchbox = canvas.getByRole('searchbox', {name: 'Search blueprint records'});
		await expect(searchbox).toHaveFocus();
		await expect(searchbox).toHaveAttribute('data-factorio-style', 'search_popup_textfield');
		await expect(searchbox.closest('label')).toHaveAttribute('data-factorio-style', 'search_popup_frame');

		await userEvent.type(searchbox, 'nuclear reactor');
		const emptyState = canvas.getByRole('status');
		await expect(emptyState).toHaveTextContent('No matching records.');
		await expect(emptyState).toHaveAttribute('data-website-extension', 'filtered-empty-message');
		await expect(canvas.queryByRole('list')).toBeNull();
	},
};
