import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintLabelIcons',
	component: BlueprintLabelIcons,
	args: {
		icons: [
			{type: 'item', name: 'transport-belt', quality: 'rare'},
			undefined,
			{type: 'virtual', name: 'signal-red'},
			{type: 'item', name: 'speed-module-3', quality: 'legendary'},
		],
		itemName: 'blueprint',
		onChange: fn(),
		onChoose: fn(),
		signalTitle: (signal) => `${signal.type ?? 'item'}:${signal.name}`,
	},
	decorators: [
		(StoryComponent) => (
			<div className="blueprint-editor__icons">
				<div>
					<StoryComponent />
				</div>
			</div>
		),
	],
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintLabelIcons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourPositionalSlots: Story = {
	play: async ({canvasElement, args}) => {
		const canvas = within(canvasElement);
		const preview = canvas.getByRole('img', {name: 'Blueprint icon preview'});
		const slots = canvas.getAllByRole('button');
		const previewBounds = preview.getBoundingClientRect();
		const slotBounds = slots.map((slot) => slot.getBoundingClientRect());

		await expect({
			geometry: {
				preview: {height: previewBounds.height, width: previewBounds.width},
				previewToSlotsGap: slotBounds[0].left - previewBounds.right,
				slotGap: slotBounds[1].left - slotBounds[0].right,
				slots: slotBounds.map(({height, top, width}) => ({height, top, width})),
			},
			previewCount: preview.getAttribute('data-preview-icon-count'),
			qualityBadgeCount: canvas.getAllByTestId('quality').length,
			recordType: preview.getAttribute('data-record-type'),
			slotIndexes: slots.map((slot) => slot.getAttribute('data-icon-slot-index')),
			slotNames: slots.map((slot) => slot.getAttribute('aria-label')),
		}).toStrictEqual({
			geometry: {
				preview: {height: 64, width: 64},
				previewToSlotsGap: 8,
				slotGap: 2,
				slots: slotBounds.map(() => ({height: 40, top: previewBounds.top + 12, width: 40})),
			},
			previewCount: '3',
			qualityBadgeCount: 4,
			recordType: 'blueprint',
			slotIndexes: ['1', '2', '3', '4'],
			slotNames: ['Edit icon 1', 'Choose icon 2', 'Edit icon 3', 'Edit icon 4'],
		});
		await expect(canvas.queryByRole('button', {name: /move|up|down/i})).toBeNull();
		await userEvent.tab();
		await expect(slots[0]).toHaveFocus();
		await expect(getComputedStyle(slots[0]).outlineColor).toBe('rgb(227, 152, 39)');
		await userEvent.click(slots[1]);
		await expect(args.onChoose).toHaveBeenCalledWith(1);
	},
};

export const BlueprintBookComposite: Story = {
	args: {
		itemName: 'blueprint-book',
	},
};
