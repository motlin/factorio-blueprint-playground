import type {Meta, StoryObj} from '@storybook/react-vite';
import type React from 'react';
import {expect, within} from 'storybook/test';

import {
	FactorioButton,
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
