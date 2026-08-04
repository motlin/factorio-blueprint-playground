import {Search, Trash2, X} from 'lucide-react';
import {useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import type React from 'react';

import gameUiSpec from '../../generated/game-ui-spec.json';
import {
	FactorioButtonKind,
	FactorioFrameDepth,
	FactorioTooltipPlacement,
	factorioQualityLabel,
} from './factorioPrimitiveTypes';

function classes(...values: Array<string | undefined>): string {
	return values.filter((value) => value !== undefined && value !== '').join(' ');
}

const factorioButtonStyleByKind: Record<FactorioButtonKind, string> = {
	[FactorioButtonKind.Neutral]: 'button',
	[FactorioButtonKind.Confirm]: 'green_button',
	[FactorioButtonKind.Delete]: 'tool_button_red',
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
	size?: number;
}

export function FactorioInventorySlot({
	children,
	className,
	disabled,
	ref,
	selected,
	size,
	style,
	type = 'button',
	'aria-disabled': ariaDisabled,
	...buttonProps
}: FactorioInventorySlotProps) {
	const slotSize = `calc(${(size ?? gameUiSpec.styles.slotSize).toString()}px * var(--factorio-ui-density, 1))`;
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			disabled={disabled}
			aria-disabled={ariaDisabled ?? disabled ?? false}
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
	ref?: React.Ref<HTMLDivElement>;
}

export function FactorioScrollFrame({children, className, ref, tabIndex = 0, ...frameProps}: FactorioScrollFrameProps) {
	return (
		<div
			{...frameProps}
			ref={ref}
			className={classes('factorio-frame', 'factorio-frame--deep', 'factorio-scroll-frame', className)}
			data-factorio-style={gameUiSpec.styles.bindings.deepSlotsScrollPane}
			data-factorio-scroll-owner="true"
			role="region"
			tabIndex={tabIndex}
		>
			{children}
		</div>
	);
}

interface FactorioTooltipPosition {
	left: number;
	top: number;
}

export interface FactorioTooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
	heading?: React.ReactNode;
	open?: boolean;
	placement?: FactorioTooltipPlacement;
	ref?: React.Ref<HTMLSpanElement>;
}

const TOOLTIP_EDGE_MARGIN = 10;
const TOOLTIP_ANCHOR_OFFSET = 8;
const TOOLTIP_CLOSE_GRACE_PERIOD = 100;

function clampedTooltipPosition(
	anchorBounds: DOMRect,
	tooltipBounds: DOMRect,
	placement: FactorioTooltipPlacement,
): FactorioTooltipPosition {
	const maximumLeft = Math.max(TOOLTIP_EDGE_MARGIN, window.innerWidth - tooltipBounds.width - TOOLTIP_EDGE_MARGIN);
	const left = Math.min(
		Math.max(TOOLTIP_EDGE_MARGIN, anchorBounds.left + (anchorBounds.width - tooltipBounds.width) / 2),
		maximumLeft,
	);
	const above = anchorBounds.top - tooltipBounds.height - TOOLTIP_ANCHOR_OFFSET;
	const below = anchorBounds.bottom + TOOLTIP_ANCHOR_OFFSET;
	const preferredTop = placement === FactorioTooltipPlacement.Above ? above : below;
	const fallbackTop = placement === FactorioTooltipPlacement.Above ? below : above;
	const preferredFits =
		preferredTop >= TOOLTIP_EDGE_MARGIN &&
		preferredTop + tooltipBounds.height <= window.innerHeight - TOOLTIP_EDGE_MARGIN;
	const unclampedTop = preferredFits ? preferredTop : fallbackTop;
	const maximumTop = Math.max(TOOLTIP_EDGE_MARGIN, window.innerHeight - tooltipBounds.height - TOOLTIP_EDGE_MARGIN);
	return {
		left,
		top: Math.min(Math.max(TOOLTIP_EDGE_MARGIN, unclampedTop), maximumTop),
	};
}

function assignTooltipReference(
	reference: React.Ref<HTMLSpanElement> | undefined,
	element: HTMLSpanElement | null,
): void {
	if (typeof reference === 'function') {
		reference(element);
	} else if (reference !== null && reference !== undefined) {
		reference.current = element;
	}
}

export function FactorioTooltip({
	children,
	className,
	heading,
	onPointerEnter,
	onPointerLeave,
	open,
	placement = FactorioTooltipPlacement.Above,
	ref,
	style,
	...tooltipProps
}: FactorioTooltipProps) {
	const markerReference = useRef<HTMLSpanElement>(null);
	const tooltipReference = useRef<HTMLSpanElement>(null);
	const showReference = useRef<() => void>(() => undefined);
	const scheduleCloseReference = useRef<() => void>(() => undefined);

	useLayoutEffect(() => {
		const anchor = markerReference.current?.parentElement;
		const tooltip = tooltipReference.current;
		if (anchor === null || anchor === undefined || tooltip === null) {
			throw new Error('FactorioTooltip must be a direct child of its tooltip trigger.');
		}
		let closeTimer = 0;
		let trackingPosition = false;
		let disconnectResizeObserver = (): void => undefined;
		const updatePosition = (): void => {
			const nextPosition = clampedTooltipPosition(
				anchor.getBoundingClientRect(),
				tooltip.getBoundingClientRect(),
				placement,
			);
			tooltip.style.left = `${nextPosition.left.toString()}px`;
			tooltip.style.top = `${nextPosition.top.toString()}px`;
		};
		const stopTrackingPosition = (): void => {
			if (!trackingPosition) {
				return;
			}
			trackingPosition = false;
			disconnectResizeObserver();
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
		const startTrackingPosition = (): void => {
			updatePosition();
			if (trackingPosition) {
				return;
			}
			trackingPosition = true;
			if (typeof ResizeObserver === 'function') {
				const resizeObserver = new ResizeObserver(updatePosition);
				resizeObserver.observe(anchor);
				resizeObserver.observe(tooltip);
				disconnectResizeObserver = () => {
					resizeObserver.disconnect();
				};
			}
			window.addEventListener('resize', updatePosition);
			window.addEventListener('scroll', updatePosition, true);
		};
		const cancelClose = (): void => {
			window.clearTimeout(closeTimer);
			closeTimer = 0;
		};
		const setTooltipOpen = (nextOpen: boolean): void => {
			const visible = open ?? nextOpen;
			tooltip.dataset.factorioTooltipOpen = visible.toString();
			if (visible) {
				startTrackingPosition();
			} else {
				stopTrackingPosition();
			}
		};
		const show = (): void => {
			cancelClose();
			setTooltipOpen(true);
		};
		const scheduleClose = (): void => {
			cancelClose();
			closeTimer = window.setTimeout(() => {
				setTooltipOpen(false);
				closeTimer = 0;
			}, TOOLTIP_CLOSE_GRACE_PERIOD);
		};
		showReference.current = show;
		scheduleCloseReference.current = scheduleClose;
		anchor.addEventListener('pointerenter', show);
		anchor.addEventListener('pointerleave', scheduleClose);
		anchor.addEventListener('focusin', show);
		anchor.addEventListener('focusout', scheduleClose);
		setTooltipOpen(false);
		return () => {
			cancelClose();
			stopTrackingPosition();
			showReference.current = () => undefined;
			scheduleCloseReference.current = () => undefined;
			anchor.removeEventListener('pointerenter', show);
			anchor.removeEventListener('pointerleave', scheduleClose);
			anchor.removeEventListener('focusin', show);
			anchor.removeEventListener('focusout', scheduleClose);
		};
	}, [open, placement]);

	const tooltip = (
		<span
			{...tooltipProps}
			ref={(element) => {
				tooltipReference.current = element;
				assignTooltipReference(ref, element);
			}}
			className={classes('factorio-tooltip', className)}
			data-factorio-placement={placement}
			data-factorio-tooltip-open={open ?? false}
			role="tooltip"
			style={{...style, left: TOOLTIP_EDGE_MARGIN, top: TOOLTIP_EDGE_MARGIN}}
			onPointerEnter={(event: ReactPointerEvent<HTMLSpanElement>) => {
				showReference.current();
				onPointerEnter?.(event);
			}}
			onPointerLeave={(event: ReactPointerEvent<HTMLSpanElement>) => {
				scheduleCloseReference.current();
				onPointerLeave?.(event);
			}}
		>
			{heading === undefined ? null : <strong className="factorio-tooltip__title">{heading}</strong>}
			<span className="factorio-tooltip__body">{children}</span>
		</span>
	);

	return (
		<>
			<span ref={markerReference} className="factorio-tooltip__anchor-marker" aria-hidden="true" />
			{typeof document === 'undefined' ? tooltip : createPortal(tooltip, document.body)}
		</>
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
