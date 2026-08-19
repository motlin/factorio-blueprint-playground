import {Search, Trash2, X} from 'lucide-react';
import type React from 'react';

import gameUiSpec from '../../generated/game-ui-spec.json';
import {FactorioButtonKind, FactorioFrameDepth} from './factorioPrimitiveTypes';

function classes(...values: Array<string | undefined>): string {
	return values.filter((value) => value !== undefined && value !== '').join(' ');
}

export interface FactorioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	kind?: FactorioButtonKind;
}

function defaultButtonContents(kind: FactorioButtonKind): React.ReactNode {
	if (kind === FactorioButtonKind.Search) {
		return <Search aria-hidden="true" />;
	}
	if (kind === FactorioButtonKind.Close) {
		return <X aria-hidden="true" />;
	}
	if (kind === FactorioButtonKind.Delete) {
		return <Trash2 aria-hidden="true" />;
	}
	return null;
}

export function FactorioButton({
	children,
	className,
	kind = FactorioButtonKind.Neutral,
	type = 'button',
	...buttonProps
}: FactorioButtonProps) {
	return (
		<button
			{...buttonProps}
			type={type}
			className={classes('factorio-button', `factorio-button--${kind}`, className)}
		>
			{children ?? defaultButtonContents(kind)}
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
	const definition = gameUiSpec.qualities.find((candidate) => candidate.name === quality);
	if (definition === undefined) {
		throw new Error(`Unknown Factorio ${gameUiSpec.sourceVersion} quality: ${quality}`);
	}
	return (
		<img
			{...imageProps}
			className={classes('factorio-quality-badge', className)}
			src={`https://factorio-icon-cdn.pages.dev/quality/${definition.name}.webp`}
			alt={`${definition.label} quality`}
			title={`${definition.label} quality`}
		/>
	);
}
