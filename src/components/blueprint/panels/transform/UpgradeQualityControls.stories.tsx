import type {Meta, StoryObj} from '@storybook/react-vite';
import type React from 'react';
import {expect, within} from 'storybook/test';

import {AnyQualityPickerOption} from './UpgradeQualityControls';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/AnyQualityPickerOption',
	component: AnyQualityPickerOption,
	parameters: transformStoryParameters,
	args: {
		selected: false,
	},
} satisfies Meta<typeof AnyQualityPickerOption>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({children, label}: {children: React.ReactNode; label: string}) {
	return (
		<div className="any-quality-picker-story__state">
			<span>{label}</span>
			<div className="upgrade-quality-controls__comparator-menu" role="menu" aria-label={`${label} state`}>
				{children}
			</div>
		</div>
	);
}

export const States: Story = {
	tags: ['visual-conformance'],
	render: (args) => (
		<main className="any-quality-picker-story">
			<h2>Any quality</h2>
			<div className="any-quality-picker-story__states">
				<State label="Rest">
					<AnyQualityPickerOption {...args} data-testid="any-quality-rest" />
				</State>
				<State label="Hover">
					<AnyQualityPickerOption {...args} data-testid="any-quality-hover" data-visual-state="hover" />
				</State>
				<State label="Focus">
					<AnyQualityPickerOption {...args} data-testid="any-quality-focus" data-visual-state="focus" />
				</State>
				<State label="Selected">
					<AnyQualityPickerOption {...args} data-testid="any-quality-selected" selected />
				</State>
			</div>
		</main>
	),
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const options = canvas.getAllByRole('menuitemradio', {name: 'Any quality'});
		const selected = canvas.getByTestId('any-quality-selected');
		const focused = canvas.getByTestId('any-quality-focus');
		const image = selected.querySelector('img');

		await expect(
			options.map((option) => ({
				checked: option.getAttribute('aria-checked'),
				title: option.title,
			})),
		).toStrictEqual([
			{checked: 'false', title: 'Any quality'},
			{checked: 'false', title: 'Any quality'},
			{checked: 'false', title: 'Any quality'},
			{checked: 'true', title: 'Any quality'},
		]);
		await expect({
			alt: image?.getAttribute('alt'),
			source: image?.getAttribute('src'),
		}).toStrictEqual({
			alt: '',
			source: 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp',
		});
		await expect(getComputedStyle(selected).backgroundColor).toBe('rgb(178, 120, 36)');
		await expect(getComputedStyle(focused).outlineColor).toBe('rgb(227, 152, 39)');
	},
};
