import type {Meta, StoryObj} from '@storybook/react-vite';
import type React from 'react';
import {expect, waitFor, within} from 'storybook/test';

import {RichText} from '../core/text/RichText';
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
	FactorioTooltipPlacement,
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

interface ButtonExampleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	kind: FactorioButtonKind;
	label: string;
}

function ButtonExample({kind, label, ...buttonProps}: ButtonExampleProps) {
	const iconOnly = kind === FactorioButtonKind.Search || kind === FactorioButtonKind.Close;
	return (
		<FactorioButton {...buttonProps} kind={kind} aria-label={iconOnly ? label : undefined}>
			{iconOnly ? undefined : label}
		</FactorioButton>
	);
}

function ButtonKindStates({kind, label}: {kind: FactorioButtonKind; label: string}) {
	return (
		<section className="factorio-primitive-matrix__button-kind" aria-label={`${label} button states`}>
			<h3>{label}</h3>
			<div className="factorio-primitive-matrix__row">
				<StateCell label="Rest">
					<ButtonExample data-testid={`${kind}-rest`} kind={kind} label={label} />
				</StateCell>
				<StateCell label="Hover">
					<ButtonExample data-testid={`${kind}-hover`} data-visual-state="hover" kind={kind} label={label} />
				</StateCell>
				<StateCell label="Focus">
					<ButtonExample data-testid={`${kind}-focus`} data-visual-state="focus" kind={kind} label={label} />
				</StateCell>
				<StateCell label="Pressed">
					<ButtonExample
						data-testid={`${kind}-pressed`}
						data-visual-state="active"
						kind={kind}
						label={label}
					/>
				</StateCell>
				<StateCell label="Disabled">
					<ButtonExample data-testid={`${kind}-disabled`} disabled kind={kind} label={label} />
				</StateCell>
			</div>
		</section>
	);
}

const buttonKinds = [
	{kind: FactorioButtonKind.Neutral, label: 'Neutral'},
	{kind: FactorioButtonKind.Confirm, label: 'Confirm'},
	{kind: FactorioButtonKind.Delete, label: 'Delete'},
	{kind: FactorioButtonKind.Search, label: 'Search'},
	{kind: FactorioButtonKind.Close, label: 'Close'},
];

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

export const ButtonStates: Story = {
	tags: ['visual-conformance'],
	render: () => (
		<main className="factorio-primitive-matrix factorio-primitive-matrix--buttons">
			<h2>Factorio button states</h2>
			{buttonKinds.map(({kind, label}) => (
				<ButtonKindStates key={kind} kind={kind} label={label} />
			))}
		</main>
	),
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const backgrounds = buttonKinds.map(({kind}) =>
			['rest', 'hover', 'focus', 'pressed', 'disabled'].map(
				(state) => getComputedStyle(canvas.getByTestId(`${kind}-${state}`)).backgroundColor,
			),
		);
		await expect(backgrounds).toStrictEqual([
			['rgb(100, 100, 100)', 'rgb(139, 103, 69)', 'rgb(100, 100, 100)', 'rgb(177, 105, 37)', 'rgb(61, 61, 61)'],
			['rgb(94, 182, 99)', 'rgb(146, 232, 151)', 'rgb(94, 182, 99)', 'rgb(63, 145, 70)', 'rgb(40, 74, 43)'],
			['rgb(254, 90, 90)', 'rgb(255, 155, 155)', 'rgb(254, 90, 90)', 'rgb(196, 62, 62)', 'rgb(87, 31, 31)'],
			['rgba(0, 0, 0, 0)', 'rgb(139, 103, 69)', 'rgba(0, 0, 0, 0)', 'rgb(177, 105, 37)', 'rgb(61, 61, 61)'],
			['rgba(0, 0, 0, 0)', 'rgb(139, 103, 69)', 'rgba(0, 0, 0, 0)', 'rgb(177, 105, 37)', 'rgb(61, 61, 61)'],
		]);
		await expect(
			buttonKinds.map(({kind}) => {
				const rest = canvas.getByTestId(`${kind}-rest`);
				const focus = canvas.getByTestId(`${kind}-focus`);
				const disabled = canvas.getByTestId(`${kind}-disabled`);
				return {
					disabled: disabled.hasAttribute('disabled'),
					disabledAria: disabled.getAttribute('aria-disabled'),
					focusOutline: getComputedStyle(focus).outlineColor,
					height: getComputedStyle(rest).height,
					square: rest.clientWidth === rest.clientHeight,
					style: rest.getAttribute('data-factorio-style'),
				};
			}),
		).toStrictEqual([
			{
				disabled: true,
				disabledAria: 'true',
				focusOutline: 'rgb(227, 152, 39)',
				height: '28px',
				square: false,
				style: 'button',
			},
			{
				disabled: true,
				disabledAria: 'true',
				focusOutline: 'rgb(227, 152, 39)',
				height: '28px',
				square: false,
				style: 'green_button',
			},
			{
				disabled: true,
				disabledAria: 'true',
				focusOutline: 'rgb(227, 152, 39)',
				height: '28px',
				square: true,
				style: 'tool_button_red',
			},
			{
				disabled: true,
				disabledAria: 'true',
				focusOutline: 'rgb(227, 152, 39)',
				height: '24px',
				square: true,
				style: 'frame_action_button',
			},
			{
				disabled: true,
				disabledAria: 'true',
				focusOutline: 'rgb(227, 152, 39)',
				height: '24px',
				square: true,
				style: 'frame_action_button',
			},
		]);
	},
};

function TooltipExample() {
	return (
		<main className="factorio-tooltip-story">
			<div className="factorio-tooltip-story__anchor factorio-tooltip-story__anchor--top">
				<FactorioButton aria-describedby="below-tooltip">Hover or focus</FactorioButton>
				<FactorioTooltip
					id="below-tooltip"
					heading="Fast transport belt"
					open
					placement={FactorioTooltipPlacement.Above}
				>
					<RichText
						text="Moves [item=iron-plate] and [item=copper-plate] through this compact factory."
						iconSize="small"
					/>
				</FactorioTooltip>
			</div>
			<div className="factorio-tooltip-story__anchor factorio-tooltip-story__anchor--bottom">
				<FactorioButton aria-describedby="above-tooltip">Keyboard focus</FactorioButton>
				<FactorioTooltip
					id="above-tooltip"
					heading="Upgrade Planner"
					open
					placement={FactorioTooltipPlacement.Below}
				>
					Applies the selected mappings. <span className="factorio-tooltip__shortcut">U</span>
				</FactorioTooltip>
			</div>
		</main>
	);
}

export const TooltipStates: Story = {
	tags: ['visual-conformance'],
	render: () => <TooltipExample />,
	play: async ({canvasElement}) => {
		const documentBody = within(canvasElement.ownerDocument.body);
		await waitFor(async () => {
			await expect(documentBody.getAllByRole('tooltip')).toHaveLength(2);
		});
		const tooltips = documentBody.getAllByRole('tooltip');
		await expect(
			tooltips.map((tooltip) => {
				const bounds = tooltip.getBoundingClientRect();
				return {
					backgroundColor: getComputedStyle(tooltip).backgroundColor,
					bottomInsideViewport: bounds.bottom <= window.innerHeight - 10,
					leftInsideViewport: bounds.left >= 10,
					open: tooltip.dataset.factorioTooltipOpen,
					padding: getComputedStyle(tooltip).padding,
					rightInsideViewport: bounds.right <= window.innerWidth - 10,
					selectable: getComputedStyle(tooltip).userSelect,
					topInsideViewport: bounds.top >= 10,
				};
			}),
		).toStrictEqual([
			{
				backgroundColor: 'rgba(49, 48, 49, 0.94)',
				bottomInsideViewport: true,
				leftInsideViewport: true,
				open: 'true',
				padding: '0px 4px',
				rightInsideViewport: true,
				selectable: 'text',
				topInsideViewport: true,
			},
			{
				backgroundColor: 'rgba(49, 48, 49, 0.94)',
				bottomInsideViewport: true,
				leftInsideViewport: true,
				open: 'true',
				padding: '0px 4px',
				rightInsideViewport: true,
				selectable: 'text',
				topInsideViewport: true,
			},
		]);
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
			closeHeight: '24px',
			closeWidth: '24px',
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

function ScrollFrameExample() {
	const rows = Array.from({length: 12}, (_, index) => `Inventory row ${(index + 1).toString()}`);
	return (
		<main className="factorio-scroll-frame-story">
			<FactorioDialog aria-label="Scrollable inventory" className="factorio-scroll-frame-story__dialog">
				<FactorioTitleBar>
					<h2>Inventory</h2>
					<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close scroll example" />
				</FactorioTitleBar>
				<FactorioScrollFrame
					aria-label="Inventory contents"
					className="factorio-scroll-frame-story__body"
					data-testid="scroll-owner"
					data-visual-state="focus"
				>
					{rows.map((row) => (
						<p key={row}>{row}</p>
					))}
				</FactorioScrollFrame>
				<footer className="factorio-scroll-frame-story__footer">
					<span>12 rows</span>
					<FactorioButton kind={FactorioButtonKind.Confirm}>Confirm</FactorioButton>
				</footer>
			</FactorioDialog>
		</main>
	);
}

export const ScrollFrameStates: Story = {
	tags: ['visual-conformance'],
	render: () => <ScrollFrameExample />,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const dialog = canvas.getByRole('dialog', {name: 'Scrollable inventory'});
		const scrollOwner = canvas.getByTestId('scroll-owner');
		const header = dialog.querySelector<HTMLElement>(':scope > .factorio-title-bar');
		const footer = dialog.querySelector<HTMLElement>(':scope > .factorio-scroll-frame-story__footer');
		if (header === null || footer === null) {
			throw new Error('Expected the scroll example header and footer.');
		}
		scrollOwner.focus();
		await expect(scrollOwner).toHaveFocus();
		await expect({
			dialogOverflow: getComputedStyle(dialog).overflow,
			focusOutlineColor: getComputedStyle(scrollOwner).outlineColor,
			focusOutlineOffset: getComputedStyle(scrollOwner).outlineOffset,
			headerInsideDialog: header.getBoundingClientRect().top >= dialog.getBoundingClientRect().top,
			footerInsideDialog: footer.getBoundingClientRect().bottom <= dialog.getBoundingClientRect().bottom,
			horizontalOverflow: getComputedStyle(scrollOwner).overflowX,
			isScrollable: scrollOwner.scrollHeight > scrollOwner.clientHeight,
			ownerCount: dialog.querySelectorAll('[data-factorio-scroll-owner="true"]').length,
			scrollbarColor: getComputedStyle(scrollOwner).scrollbarColor,
			scrollbarGutter: getComputedStyle(scrollOwner).scrollbarGutter,
			style: scrollOwner.getAttribute('data-factorio-style'),
			verticalOverflow: getComputedStyle(scrollOwner).overflowY,
		}).toStrictEqual({
			dialogOverflow: 'hidden',
			focusOutlineColor: 'rgb(227, 152, 39)',
			focusOutlineOffset: '-3px',
			headerInsideDialog: true,
			footerInsideDialog: true,
			horizontalOverflow: 'hidden',
			isScrollable: true,
			ownerCount: 1,
			scrollbarColor: 'rgb(111, 109, 111) rgb(36, 35, 36)',
			scrollbarGutter: 'stable',
			style: 'deep_slots_scroll_pane',
			verticalOverflow: 'auto',
		});
	},
};
