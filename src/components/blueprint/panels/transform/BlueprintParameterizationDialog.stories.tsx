import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState, type ComponentProps} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

import type {Parameter} from '../../../../parsing/types';
import {FactorioButton} from '../../../ui/FactorioUi';
import {BlueprintParameterizationDialog} from './BlueprintParameterizationDialog';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintParameterizationDialog',
	component: BlueprintParameterizationDialog,
	args: {
		dialogId: 'blueprint-parameterization-story',
		onClose: fn(),
		onConfirm: fn(),
		parameters: [
			{
				type: 'id',
				id: 'iron-plate',
				name: 'Alice input',
				'quality-condition': {quality: 'normal', comparator: '='},
			},
			{
				type: 'id',
				id: 'electronic-circuit',
				name: 'Bob product',
				'product-of': 'iron-plate',
			},
		],
		signalOptions: [
			{type: 'item', name: 'iron-plate'},
			{type: 'item', name: 'copper-plate'},
			{type: 'item', name: 'electronic-circuit'},
		],
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintParameterizationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DependentParameters: Story = {};

export const DependencyControlStates: Story = {
	args: {
		parameters: [
			{type: 'id', id: 'iron-plate', name: 'Enabled independent'},
			{type: 'id', id: 'copper-plate', name: 'Disabled parameter', parameter: false},
			{type: 'id', id: 'electronic-circuit', name: 'Valid dependency', 'product-of': 'iron-plate'},
			{type: 'id', id: 'advanced-circuit', name: 'Invalid dependency', 'ingredient-of': 'missing-source'},
		],
		signalOptions: [
			{type: 'item', name: 'iron-plate'},
			{type: 'item', name: 'copper-plate'},
			{type: 'item', name: 'electronic-circuit'},
			{type: 'item', name: 'advanced-circuit'},
		],
	},
	play: async () => {
		const dialog = await within(document.body).findByRole('dialog', {name: 'Blueprint parametrisation'});
		const confirm = within(dialog).getByRole('button', {name: 'Confirm'});
		await expect(within(dialog).getByRole('checkbox', {name: 'Parameter 2 enabled'})).not.toBeChecked();
		await expect(
			within(dialog).getByRole('button', {name: 'Parameter 2 dependency mode: Independent'}),
		).toBeDisabled();
		await expect(
			within(dialog).getByRole('button', {name: 'Parameter 3 dependency source: Enabled independent'}),
		).not.toHaveAttribute('aria-invalid');
		await expect(
			within(dialog).getByRole('button', {name: 'Parameter 4 dependency source: missing-source unavailable'}),
		).toHaveAttribute('aria-invalid', 'true');
		await expect(confirm).toBeDisabled();
		await expect(confirm).toHaveAttribute('data-factorio-style', 'green_button');
		await expect(confirm).toHaveAttribute('title', "Source of dependency isn't above.");
	},
};

export const AddAndRemoveControls: Story = {
	args: {
		parameters: [{type: 'id', id: 'iron-plate', name: 'Existing parameter'}],
	},
	play: async () => {
		const dialog = await within(document.body).findByRole('dialog', {name: 'Blueprint parametrisation'});
		const add = within(dialog).getByRole('button', {name: 'Add parameter'});
		await expect(add).toHaveAttribute('data-factorio-style', 'button');
		await userEvent.click(add);
		const removeButtons = within(dialog).getAllByRole('button', {name: /^Remove parameter /});
		await expect(removeButtons).toHaveLength(2);
		for (const remove of removeButtons) {
			await expect(remove).toHaveAttribute('data-factorio-style', 'tool_button_red');
		}
		await expect(within(dialog).getByRole('button', {name: 'Confirm'})).toBeEnabled();
	},
};

export const ReorderedParameters: Story = {
	args: {
		parameters: [
			{
				type: 'id',
				id: 'iron-plate',
				name: 'Alice input',
				'quality-condition': {quality: 'normal', comparator: '='},
			},
			{
				type: 'id',
				id: 'electronic-circuit',
				name: 'Bob product',
			},
		],
	},
	play: async () => {
		const dialog = await within(document.body).findByRole('dialog', {name: 'Blueprint parametrisation'});
		const bobHandle = within(dialog).getByRole('button', {name: /^Reorder Bob product\./});
		bobHandle.focus();
		await userEvent.keyboard('{ArrowUp}');
		await expect(
			within(dialog)
				.getAllByRole<HTMLInputElement>('textbox')
				.map((input) => input.value),
		).toStrictEqual(['Bob product', 'Alice input']);
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
		await expect(within(dialog).getByRole('button', {name: /^Reorder Bob product\./})).toHaveFocus();
	},
};

const scrollableSignalNames = [
	'iron-plate',
	'copper-plate',
	'electronic-circuit',
	'advanced-circuit',
	'processing-unit',
	'iron-gear-wheel',
	'steel-plate',
	'copper-cable',
	'stone-brick',
	'battery',
] as const;

const scrollableParameters: Parameter[] = scrollableSignalNames.map((id, index) => ({
	type: 'id',
	id,
	name: `Parameter ${(index + 1).toString()}`,
	'quality-condition': {quality: 'normal', comparator: '='},
}));

export const ScrollableParameters: Story = {
	args: {
		parameters: scrollableParameters,
		signalOptions: scrollableSignalNames.map((name) => ({type: 'item', name})),
	},
};

function ParameterizationLauncher(props: ComponentProps<typeof BlueprintParameterizationDialog>) {
	const [open, setOpen] = useState(false);
	return (
		<div style={{boxSizing: 'border-box', minHeight: '100vh', padding: '48px'}}>
			<FactorioButton
				aria-label="Open Blueprint parametrisation"
				onClick={() => {
					setOpen(true);
				}}
			>
				Open Blueprint parametrisation
			</FactorioButton>
			{open ? (
				<BlueprintParameterizationDialog
					{...props}
					onClose={() => {
						setOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}

export const AnchoredScrollableParameters: Story = {
	args: {
		parameters: scrollableParameters,
		signalOptions: scrollableSignalNames.map((name) => ({type: 'item', name})),
	},
	render: (args) => <ParameterizationLauncher {...args} />,
	play: async () => {
		await userEvent.click(within(document.body).getByRole('button', {name: 'Open Blueprint parametrisation'}));
		const dialog = await within(document.body).findByRole('dialog', {name: 'Blueprint parametrisation'});
		await expect(dialog.parentElement?.dataset.anchorPlacement).toBe('anchored');
	},
};
