import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {UpgradeQualityControls} from './UpgradeQualityControls';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradeExactQualityControls',
	component: UpgradeQualityControls,
	parameters: transformStoryParameters,
	args: {
		mode: 'target',
		onQualityChange: fn(),
		qualityComparator: '=',
		qualitySelection: 'normal',
	},
} satisfies Meta<typeof UpgradeQualityControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FiveQualityButtons: Story = {
	tags: ['visual-conformance'],
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const qualityControls = canvas.getByRole('group', {name: 'Target quality'});
		const qualityButtons = within(qualityControls).getAllByRole('button');

		await expect(qualityControls).toHaveAttribute('data-quality-selector-mode', 'buttons');
		await expect(
			qualityButtons.map((button) => ({
				image: button.querySelector('img')?.getAttribute('src'),
				label: button.getAttribute('aria-label'),
				title: button.title,
			})),
		).toStrictEqual([
			{
				image: 'https://factorio-icon-cdn.pages.dev/quality/normal.webp',
				label: 'Normal quality',
				title: 'Quality: Normal',
			},
			{
				image: 'https://factorio-icon-cdn.pages.dev/quality/uncommon.webp',
				label: 'Uncommon quality',
				title: 'Quality: Uncommon',
			},
			{
				image: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
				label: 'Rare quality',
				title: 'Quality: Rare',
			},
			{
				image: 'https://factorio-icon-cdn.pages.dev/quality/epic.webp',
				label: 'Epic quality',
				title: 'Quality: Epic',
			},
			{
				image: 'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
				label: 'Legendary quality',
				title: 'Quality: Legendary',
			},
		]);
		await expect(within(qualityControls).queryByRole('combobox', {name: 'Quality'})).not.toBeInTheDocument();
		await expect(
			within(qualityControls).queryByRole('button', {name: /Quality comparison/}),
		).not.toBeInTheDocument();

		await userEvent.click(within(qualityControls).getByRole('button', {name: 'Legendary quality'}));
		await expect(args.onQualityChange.mock.calls).toStrictEqual([['legendary']]);
	},
};
