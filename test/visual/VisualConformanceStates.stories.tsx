import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, within} from 'storybook/test';

import {transformStoryParameters} from '../../src/components/blueprint/panels/transform/transformStoryParameters';
import {FactorioButton, FactorioFrame, FactorioInventorySlot} from '../../src/components/ui/FactorioPrimitives';

const meta = {
	title: 'Visual Conformance/State contract',
	parameters: {
		...transformStoryParameters,
		a11y: {test: 'error'},
	},
	tags: ['visual-conformance'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StableStates: Story = {
	render: () => (
		<main aria-labelledby="visual-conformance-title" style={{padding: 24}}>
			<h1 id="visual-conformance-title">Stable visual states</h1>
			<section aria-label="Button states" style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
				<FactorioButton>Rest</FactorioButton>
				<FactorioButton data-visual-state="hover">Hover</FactorioButton>
				<FactorioButton autoFocus>Focus</FactorioButton>
				<FactorioButton data-visual-state="active">Pressed</FactorioButton>
				<FactorioButton disabled>Disabled</FactorioButton>
			</section>
			<section aria-label="Inventory states" style={{display: 'flex', gap: 12, marginTop: 16}}>
				<FactorioInventorySlot aria-label="Filled slot">1</FactorioInventorySlot>
				<FactorioInventorySlot aria-label="Selected slot" selected>
					2
				</FactorioInventorySlot>
				<FactorioInventorySlot aria-label="Empty slot" />
			</section>
			<FactorioFrame aria-label="Error state" role="alert" style={{marginTop: 16}}>
				Example visual-conformance error
			</FactorioFrame>
		</main>
	),
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('button', {name: 'Focus'})).toHaveFocus();
		await expect(
			canvas.getAllByRole('button').map((button) => ({
				disabled: button.hasAttribute('disabled'),
				label: button.getAttribute('aria-label') ?? button.textContent,
				pressed: button.getAttribute('aria-pressed'),
				visualState: button.getAttribute('data-visual-state'),
			})),
		).toStrictEqual([
			{disabled: false, label: 'Rest', pressed: null, visualState: null},
			{disabled: false, label: 'Hover', pressed: null, visualState: 'hover'},
			{disabled: false, label: 'Focus', pressed: null, visualState: null},
			{disabled: false, label: 'Pressed', pressed: null, visualState: 'active'},
			{disabled: true, label: 'Disabled', pressed: null, visualState: null},
			{disabled: false, label: 'Filled slot', pressed: null, visualState: null},
			{disabled: false, label: 'Selected slot', pressed: 'true', visualState: null},
			{disabled: false, label: 'Empty slot', pressed: null, visualState: null},
		]);
		await expect(canvas.getByRole('alert')).toHaveTextContent('Example visual-conformance error');
	},
};
