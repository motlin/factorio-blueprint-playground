import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {transformStoryParameters} from './transformStoryParameters';
import {UpgradeMappingGrid, type PositionedUpgradeMapping} from './UpgradeMappingGrid';

function sequentialMappings(count: number): PositionedUpgradeMapping[] {
	return Array.from({length: count}, (_, slotIndex) => ({
		count: slotIndex + 1,
		from: {type: 'entity', name: 'transport-belt'},
		mappingId: `mapping-${(slotIndex + 1).toString()}`,
		slotIndex,
		to: {type: 'entity', name: 'fast-transport-belt'},
	}));
}

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradeMappingGrid',
	component: UpgradeMappingGrid,
	args: {
		mappings: [
			{
				count: 4,
				from: {type: 'entity', name: 'transport-belt'},
				mappingId: 'mapping-belt',
				slotIndex: 0,
				to: {type: 'entity', name: 'fast-transport-belt'},
			},
			{
				count: 0,
				from: {type: 'entity', name: 'underground-belt'},
				mappingId: 'mapping-underground-belt',
				slotIndex: 4,
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
		],
		onChooseSource: fn(),
		onChooseTarget: fn(),
		onClearEndpoint: fn(),
		onMove: fn(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof UpgradeMappingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function mappingCountStory(mappingCount: number, slotCount: number): Story {
	return {
		args: {mappings: sequentialMappings(mappingCount)},
		play: async ({canvasElement}) => {
			const canvas = within(canvasElement);
			const grid = canvas.getByRole('group', {name: 'From and To mappings'});
			const table = grid.querySelector<HTMLElement>('.upgrade-mapping-grid__table');
			if (table === null) {
				throw new Error('Expected the upgrade mapping table.');
			}
			const tableBounds = table.getBoundingClientRect();
			const headings = [...grid.querySelectorAll<HTMLElement>('.upgrade-mapping-grid__headings > div')];
			const slots = [...grid.querySelectorAll<HTMLElement>('[data-upgrade-mapping-slot]')];
			await expect({
				columns: table.dataset.factorioColumns,
				externalAddForm: canvas.queryByRole('button', {name: /^Add /}),
				gridWidth: grid.getBoundingClientRect().width,
				headingOffsets: headings.map((heading) =>
					Math.round(heading.getBoundingClientRect().left - tableBounds.left),
				),
				headings: headings.map((group) => group.textContent),
				mappingCount: grid.querySelectorAll('[data-mapping-key]').length,
				minimumRows: table.dataset.factorioMinimumRows,
				rowHeight: Math.round(slots[4].getBoundingClientRect().top - slots[0].getBoundingClientRect().top),
				rowCount: grid.querySelectorAll('[data-upgrade-mapping-slot]').length / 4,
				slotOffsets: slots
					.slice(0, 4)
					.map((slot) => Math.round(slot.getBoundingClientRect().left - tableBounds.left)),
				slotCount: grid.querySelectorAll('[data-upgrade-mapping-slot]').length,
				source: grid.dataset.factorioSource,
				style: table.dataset.factorioStyle,
			}).toStrictEqual({
				columns: '4',
				externalAddForm: null,
				gridWidth: 400,
				headingOffsets: [0, 107, 213, 320],
				headings: ['FromTo', 'FromTo', 'FromTo', 'FromTo'],
				mappingCount,
				minimumRows: '4',
				rowHeight: 40,
				rowCount: slotCount / 4,
				slotOffsets: [0, 107, 213, 320],
				slotCount,
				source: 'UpgradeItemGui::MappersWidgets',
				style: 'mappers_table',
			});
		},
	};
}

export const Empty: Story = {...mappingCountStory(0, 16)};

export const OneMapping: Story = {...mappingCountStory(1, 16)};

export const FourMappings: Story = {...mappingCountStory(4, 16)};

export const FiveMappings: Story = {...mappingCountStory(5, 16)};

export const SixteenMappings: Story = {...mappingCountStory(16, 20)};

export const SeventeenMappings: Story = {...mappingCountStory(17, 24)};

export const OrderedMappings: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		await expect(args.onChooseSource).toHaveBeenLastCalledWith('mapping-belt', 0);
		await userEvent.keyboard('{Control>}{ArrowRight}{/Control}');
		await expect(args.onMove).toHaveBeenLastCalledWith('mapping-belt', 1);
	},
};
