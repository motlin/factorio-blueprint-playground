import type {Meta, StoryObj} from '@storybook/react-vite';
import type {CSSProperties} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

import gameUiSpec from '../../../../generated/game-ui-spec.json';
import {AddUpgradeMappingRow} from './AddUpgradeMappingRow';
import {transformStoryParameters} from './transformStoryParameters';

const emptyPairStyle: CSSProperties & Record<`--upgrade-mapping-${string}`, string> = {
	'--upgrade-mapping-slot-width': `${gameUiSpec.styles.slotColumnHeaderWidth.toString()}px`,
	width: 'max-content',
};

const meta = {
	title: 'Blueprint/Panels/Transform/AddUpgradeMappingRow',
	component: AddUpgradeMappingRow,
	args: {
		onSourceChoose: fn(),
		onTargetChoose: fn(),
		slotIndex: 0,
	},
	decorators: [
		(Story) => (
			<div style={emptyPairStyle}>
				<Story />
			</div>
		),
	],
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof AddUpgradeMappingRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyPair: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const pair = canvas.getByRole('group', {name: 'Empty mapping slot 1'});
		const slots = within(pair).getAllByRole('button');
		const pairBounds = pair.getBoundingClientRect();
		await expect({
			className: pair.className,
			draggable: pair.getAttribute('draggable'),
			factorioSource: pair.dataset.factorioSource,
			mappingState: pair.dataset.mappingState,
			pairHeight: Math.round(pairBounds.height),
			pairWidth: Math.round(pairBounds.width),
			slotContents: slots.map((slot) => slot.textContent),
			slotDisabled: slots.map((slot) => slot.getAttribute('aria-disabled')),
			slotNames: slots.map((slot) => slot.getAttribute('aria-label')),
			slotOffsets: slots.map((slot) => Math.round(slot.getBoundingClientRect().left - pairBounds.left)),
			slotTooltips: slots.map((slot) => slot.getAttribute('title')),
			slotWidths: slots.map((slot) => Math.round(slot.getBoundingClientRect().width)),
		}).toStrictEqual({
			className: 'upgrade-mapping-grid__pair upgrade-mapping-grid__pair--empty',
			draggable: null,
			factorioSource: 'UpgradeItemGui::addEmptyMapper',
			mappingState: 'empty',
			pairHeight: 40,
			pairWidth: 80,
			slotContents: ['', ''],
			slotDisabled: ['false', 'false'],
			slotNames: ['Choose source for new mapping', 'Choose target for new mapping'],
			slotOffsets: [0, 40],
			slotTooltips: [null, null],
			slotWidths: [40, 40],
		});
	},
};

export const EitherEndpointStartsMapper: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Choose source for new mapping'}));
		await expect(args.onSourceChoose).toHaveBeenCalledTimes(1);
		await userEvent.click(canvas.getByRole('button', {name: 'Choose target for new mapping'}));
		await expect(args.onTargetChoose).toHaveBeenCalledTimes(1);
		await userEvent.keyboard('{Delete}');
		await expect({
			sourceCalls: args.onSourceChoose.mock.calls,
			targetCalls: args.onTargetChoose.mock.calls,
		}).toStrictEqual({
			sourceCalls: [[]],
			targetCalls: [[]],
		});
	},
};

export const FocusedTargetSlot: Story = {
	play: async ({canvasElement}) => {
		const target = within(canvasElement).getByRole('button', {name: 'Choose target for new mapping'});
		target.focus();
		await expect(target).toHaveFocus();
	},
};
