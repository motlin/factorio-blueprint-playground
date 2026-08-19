import type {Meta, StoryObj} from '@storybook/react-vite';
import type React from 'react';
import {expect, within} from 'storybook/test';

import {
	FactorioButton,
	FactorioDialog,
	FactorioDialogBackdrop,
	FactorioFrame,
	FactorioInventorySlot,
	FactorioQualityBadge,
	FactorioScrollFrame,
	FactorioTitleBar,
	FactorioTooltip,
	FactorioButtonKind,
	FactorioFrameDepth,
} from './FactorioUi';

const meta: Meta = {
	title: 'UI/Factorio primitives',
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj;

function StateCell({children, label}: {children: React.ReactNode; label: string}) {
	return (
		<div className="factorio-primitive-matrix__cell">
			<span>{label}</span>
			{children}
		</div>
	);
}

interface DensityStyle extends React.CSSProperties {
	'--factorio-ui-density': number;
}

function DensityMatrix({density}: {density: number}) {
	const style: DensityStyle = {'--factorio-ui-density': density};
	return (
		<section className="factorio-primitive-matrix__density" style={style}>
			<h2>{density.toString()}× pixel density</h2>

			<h3>Inventory slots</h3>
			<div className="factorio-primitive-matrix__row">
				<StateCell label="Rest">
					<FactorioInventorySlot
						aria-label={`${density.toString()}x rest slot`}
						data-testid={`density-${density.toString()}-slot`}
					>
						1
					</FactorioInventorySlot>
				</StateCell>
				<StateCell label="Hover">
					<FactorioInventorySlot aria-label={`${density.toString()}x hovered slot`} data-visual-state="hover">
						2
					</FactorioInventorySlot>
				</StateCell>
				<StateCell label="Selected">
					<FactorioInventorySlot aria-label={`${density.toString()}x selected slot`} selected>
						3
					</FactorioInventorySlot>
				</StateCell>
				<StateCell label="Disabled">
					<FactorioInventorySlot aria-label={`${density.toString()}x disabled slot`} disabled>
						4
					</FactorioInventorySlot>
				</StateCell>
			</div>

			<h3>Buttons</h3>
			<div className="factorio-primitive-matrix__row">
				<StateCell label="Neutral">
					<FactorioButton>Cancel</FactorioButton>
				</StateCell>
				<StateCell label="Hover">
					<FactorioButton data-visual-state="hover">Hovered</FactorioButton>
				</StateCell>
				<StateCell label="Pressed">
					<FactorioButton data-visual-state="active">Pressed</FactorioButton>
				</StateCell>
				<StateCell label="Disabled">
					<FactorioButton disabled>Disabled</FactorioButton>
				</StateCell>
				<StateCell label="Confirm">
					<FactorioButton kind={FactorioButtonKind.Confirm}>Confirm</FactorioButton>
				</StateCell>
				<StateCell label="Delete">
					<FactorioButton kind={FactorioButtonKind.Delete}>Delete</FactorioButton>
				</StateCell>
				<StateCell label="Search">
					<FactorioButton kind={FactorioButtonKind.Search} aria-label="Search signals" />
				</StateCell>
				<StateCell label="Close">
					<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close matrix" />
				</StateCell>
				<StateCell label="Close hover">
					<FactorioButton
						kind={FactorioButtonKind.Close}
						aria-label="Hovered close control"
						data-visual-state="hover"
					/>
				</StateCell>
				<StateCell label="Close pressed">
					<FactorioButton
						kind={FactorioButtonKind.Close}
						aria-label="Pressed close control"
						data-visual-state="active"
					/>
				</StateCell>
				<StateCell label="Close disabled">
					<FactorioButton kind={FactorioButtonKind.Close} aria-label="Disabled close control" disabled />
				</StateCell>
			</div>

			<h3>Frames, title bar, scroll frame, tooltip, and quality badges</h3>
			<div className="factorio-primitive-matrix__surfaces">
				<FactorioFrame depth={FactorioFrameDepth.Shallow}>Shallow frame</FactorioFrame>
				<FactorioFrame depth={FactorioFrameDepth.Deep}>Deep frame</FactorioFrame>
				<div className="factorio-primitive-matrix__window">
					<FactorioTitleBar>
						<strong>Striped title bar</strong>
					</FactorioTitleBar>
					<FactorioScrollFrame aria-label={`${density.toString()}x scroll frame`}>
						<p>Selectable scroll-frame text.</p>
						<p>Additional content establishes overflow and preserves keyboard scrolling.</p>
					</FactorioScrollFrame>
				</div>
				<FactorioTooltip>Inventory slot tooltip</FactorioTooltip>
				<div className="factorio-primitive-matrix__qualities" aria-label="Quality badges">
					{['normal', 'uncommon', 'rare', 'epic', 'legendary'].map((quality) => (
						<FactorioQualityBadge key={quality} quality={quality} />
					))}
				</div>
			</div>
		</section>
	);
}

export const StateMatrix: Story = {
	render: () => (
		<main className="factorio-primitive-matrix">
			<DensityMatrix density={1} />
			<DensityMatrix density={2} />
		</main>
	),
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const slots = [canvas.getByTestId('density-1-slot'), canvas.getByTestId('density-2-slot')];
		const dimensions = slots.map((slot) => ({
			height: getComputedStyle(slot).height,
			width: getComputedStyle(slot).width,
		}));
		await expect(dimensions).toStrictEqual([
			{height: '40px', width: '40px'},
			{height: '80px', width: '80px'},
		]);
		await expect(
			canvas.getAllByRole('button', {name: /disabled slot/}).map((button) => button.hasAttribute('disabled')),
		).toStrictEqual([true, true]);
		await expect(canvas.getAllByRole('button', {name: 'Search signals'}).length).toBe(2);
		await expect(canvas.getAllByRole('button', {name: 'Close matrix'}).length).toBe(2);
	},
};

function DialogChromeExample({nested}: {nested: boolean}) {
	return (
		<>
			<FactorioDialogBackdrop>
				<FactorioDialog aria-label="Inventory" aria-hidden={nested || undefined} inert={nested}>
					<FactorioTitleBar>
						<h2>Inventory</h2>
						<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close Inventory" />
					</FactorioTitleBar>
					<div className="factorio-dialog__body">
						<p>Dialog content begins at Teoxoy’s twelve-pixel inset.</p>
						<FactorioFrame depth={FactorioFrameDepth.Deep}>Inventory slots</FactorioFrame>
					</div>
				</FactorioDialog>
			</FactorioDialogBackdrop>
			{nested ? (
				<FactorioDialogBackdrop nested>
					<FactorioDialog aria-label="Choose an item">
						<FactorioTitleBar>
							<h2>Choose an item</h2>
							<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close item picker" />
						</FactorioTitleBar>
						<div className="factorio-dialog__body">
							<p>The nested modal owns the active close control and focus state.</p>
						</div>
					</FactorioDialog>
				</FactorioDialogBackdrop>
			) : null}
		</>
	);
}

export const DialogChrome: Story = {
	render: () => <DialogChromeExample nested={false} />,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const dialog = canvas.getByRole('dialog', {name: 'Inventory'});
		const titleBar = dialog.querySelector<HTMLElement>('.factorio-title-bar');
		const closeButton = canvas.getByRole('button', {name: 'Close Inventory'});
		if (titleBar === null) {
			throw new Error('Expected the Inventory dialog title bar.');
		}
		await expect({
			backgroundColor: getComputedStyle(dialog).backgroundColor,
			closeHeight: getComputedStyle(closeButton).height,
			closeWidth: getComputedStyle(closeButton).width,
			titleMinHeight: getComputedStyle(titleBar).minHeight,
			titlePadding: getComputedStyle(titleBar).padding,
		}).toStrictEqual({
			backgroundColor: 'rgb(48, 48, 48)',
			closeHeight: '36px',
			closeWidth: '36px',
			titleMinHeight: '46px',
			titlePadding: '10px 12px 12px',
		});
		closeButton.focus();
		await expect(closeButton).toHaveFocus();
	},
};

export const NestedDialogChrome: Story = {
	render: () => <DialogChromeExample nested />,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('dialog', {name: 'Choose an item'})).toBeVisible();
		const closeButton = canvas.getByRole('button', {name: 'Close item picker'});
		closeButton.focus();
		await expect(closeButton).toHaveFocus();
		await expect(canvas.getByLabelText('Inventory', {selector: '[role="dialog"]'})).toHaveAttribute(
			'aria-hidden',
			'true',
		);
	},
};
