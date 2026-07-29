import {Search, Trash2, X} from 'lucide-react';
import type React from 'react';

import gameUiSpec from '../../generated/game-ui-spec.json';
import {FactorioButtonKind, FactorioFrameDepth, factorioQualityLabel} from './factorioPrimitiveTypes';

function classes(...values: Array<string | undefined>): string {
	return values.filter((value) => value !== undefined && value !== '').join(' ');
}

const factorioButtonStyleByKind: Record<FactorioButtonKind, string> = {
	[FactorioButtonKind.Neutral]: 'button',
	[FactorioButtonKind.Confirm]: 'green_button',
	[FactorioButtonKind.Delete]: 'red_button',
	[FactorioButtonKind.Search]: 'frame_action_button',
	[FactorioButtonKind.Close]: 'frame_action_button',
};

export interface FactorioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	kind?: FactorioButtonKind;
	ref?: React.Ref<HTMLButtonElement>;
}

function defaultButtonContents(kind: FactorioButtonKind): React.ReactNode {
	if (kind === FactorioButtonKind.Search) {
		return <Search aria-hidden="true" data-factorio-icon="search" />;
	}
	if (kind === FactorioButtonKind.Close) {
		return <X aria-hidden="true" data-factorio-icon="close" />;
	}
	if (kind === FactorioButtonKind.Delete) {
		return <Trash2 aria-hidden="true" data-factorio-icon="delete" />;
	}
	return null;
}

export function FactorioButton({
	children,
	className,
	disabled,
	kind = FactorioButtonKind.Neutral,
	ref,
	type = 'button',
	...buttonProps
}: FactorioButtonProps) {
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			disabled={disabled}
			aria-disabled={disabled ?? false}
			data-factorio-style={factorioButtonStyleByKind[kind]}
			className={classes('factorio-button', `factorio-button--${kind}`, className)}
		>
			<span className="factorio-button__content">{children ?? defaultButtonContents(kind)}</span>
		</button>
	);
}

export interface FactorioInventorySlotProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	ref?: React.Ref<HTMLButtonElement>;
	selected?: boolean;
}

export function FactorioInventorySlot({
	children,
	className,
	disabled,
	ref,
	selected,
	style,
	type = 'button',
	...buttonProps
}: FactorioInventorySlotProps) {
	const slotSize = `calc(${gameUiSpec.styles.slotSize.toString()}px * var(--factorio-ui-density, 1))`;
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			disabled={disabled}
			aria-disabled={disabled ?? false}
			aria-pressed={selected}
			data-factorio-style={gameUiSpec.styles.bindings.slotButton}
			className={classes('factorio-inventory-slot', className)}
			style={{...style, width: slotSize, height: slotSize}}
		>
			{children}
		</button>
	);
}

export interface FactorioFrameProps extends React.HTMLAttributes<HTMLDivElement> {
	depth?: FactorioFrameDepth;
}

export function FactorioFrame({
	children,
	className,
	depth = FactorioFrameDepth.Shallow,
	...frameProps
}: FactorioFrameProps) {
	return (
		<div {...frameProps} className={classes('factorio-frame', `factorio-frame--${depth}`, className)}>
			{children}
		</div>
	);
}

export interface FactorioDialogBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
	nested?: boolean;
}

export function FactorioDialogBackdrop({
	children,
	className,
	nested = false,
	...backdropProps
}: FactorioDialogBackdropProps) {
	return (
		<div
			{...backdropProps}
			className={classes(
				'factorio-dialog-backdrop',
				nested ? 'factorio-dialog-backdrop--nested' : undefined,
				className,
			)}
			data-factorio-dialog-layer={nested ? 'nested' : 'root'}
		>
			{children}
		</div>
	);
}

export interface FactorioDialogProps extends React.HTMLAttributes<HTMLElement> {
	'aria-label': string;
	ref?: React.Ref<HTMLElement>;
}

export function FactorioDialog({
	'aria-label': ariaLabel,
	children,
	className,
	ref,
	...dialogProps
}: FactorioDialogProps) {
	return (
		<section
			{...dialogProps}
			ref={ref}
			className={classes('factorio-frame', 'factorio-frame--shallow', 'factorio-dialog', className)}
			role="dialog"
			aria-label={ariaLabel}
			aria-modal="true"
		>
			{children}
		</section>
	);
}

export function FactorioTitleBar({children, className, ...headerProps}: React.HTMLAttributes<HTMLElement>) {
	return (
		<header {...headerProps} className={classes('factorio-title-bar', className)}>
			{children}
		</header>
	);
}

export interface FactorioScrollFrameProps extends React.HTMLAttributes<HTMLDivElement> {
	'aria-label': string;
}

export function FactorioScrollFrame({children, className, tabIndex = 0, ...frameProps}: FactorioScrollFrameProps) {
	return (
		<div
			{...frameProps}
			className={classes('factorio-frame', 'factorio-frame--deep', 'factorio-scroll-frame', className)}
			data-factorio-style={gameUiSpec.styles.bindings.deepSlotsScrollPane}
			role="region"
			tabIndex={tabIndex}
		>
			{children}
		</div>
	);
}

export function FactorioTooltip({children, className, ...tooltipProps}: React.HTMLAttributes<HTMLSpanElement>) {
	return (
		<span {...tooltipProps} className={classes('factorio-tooltip', className)} role="tooltip">
			{children}
		</span>
	);
}

export interface FactorioQualityBadgeProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
	quality: string;
}

export function FactorioQualityBadge({className, quality, ...imageProps}: FactorioQualityBadgeProps) {
	const label = factorioQualityLabel(quality);
	const decorative = imageProps['aria-hidden'] === true || imageProps['aria-hidden'] === 'true';
	return (
		<img
			{...imageProps}
			className={classes('factorio-quality-badge', className)}
			src={`https://factorio-icon-cdn.pages.dev/quality/${quality}.webp`}
			alt={decorative ? '' : label}
			title={label}
		/>
	);
}
