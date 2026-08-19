import {useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type Ref} from 'react';
import {createPortal} from 'react-dom';

import type {QualityComparator} from '../../../../parsing/types';
import {FactorioQualityBadge} from '../../../ui/FactorioUi';
import {
	anyQualityLabel,
	explicitQuality,
	qualitySelectorUsesDropdown,
	upgradeQualities,
	upgradeQualityComparators,
	upgradeQualityLabel,
	upgradeQualitySelectionTooltip,
	type ExplicitQuality,
	type UpgradeQualityMode,
	type UpgradeQualitySelection,
} from './upgradeQuality';
import {signalName} from './upgradePlannerSignals';
import {useDialogFocus} from './useDialogFocus';

interface UpgradeQualityControlsProps {
	mode: UpgradeQualityMode;
	onComparatorChange?: (comparator: QualityComparator) => void;
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}

export const anyQualityIconSource = 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp';

function AnyQualityIcon() {
	return (
		<span className="upgrade-quality-controls__any-icon" aria-hidden="true">
			<img alt="" draggable={false} src={anyQualityIconSource} />
		</span>
	);
}

export interface AnyQualityPickerOptionProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'aria-checked' | 'aria-label' | 'children' | 'role'
> {
	ref?: Ref<HTMLButtonElement>;
	selected: boolean;
}

export function AnyQualityPickerOption({
	className,
	ref,
	selected,
	title = anyQualityLabel,
	type = 'button',
	...buttonProps
}: AnyQualityPickerOptionProps) {
	const classes =
		className === undefined
			? 'upgrade-quality-controls__any-quality'
			: `upgrade-quality-controls__any-quality ${className}`;
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			className={classes}
			role="menuitemradio"
			aria-checked={selected}
			aria-label={anyQualityLabel}
			title={title}
		>
			<AnyQualityIcon />
		</button>
	);
}

interface QualityComparatorMenuProps {
	anchor: QualityComparatorMenuAnchor;
	onAnyChoose: () => void;
	onCancel: () => void;
	onComparatorChoose: (comparator: QualityComparator) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}

interface QualityComparatorMenuAnchor {
	bottom?: number;
	left: number;
	placement: 'above' | 'below';
	top?: number;
	width: number;
}

function QualityComparatorMenu({
	anchor,
	onAnyChoose,
	onCancel,
	onComparatorChoose,
	qualityComparator,
	qualitySelection,
}: QualityComparatorMenuProps) {
	const selectedIndex = qualitySelection === 'any' ? 0 : upgradeQualityComparators.indexOf(qualityComparator) + 1;
	const [activeIndex, setActiveIndex] = useState(selectedIndex);
	const menuItemReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[role="menuitemradio"][aria-checked="true"]',
		onClose: onCancel,
	});
	const menuStyle: CSSProperties = {
		left: anchor.left,
		width: anchor.width,
		...(anchor.placement === 'above' ? {bottom: anchor.bottom} : {top: anchor.top}),
	};
	const focusMenuItem = (index: number) => {
		setActiveIndex(index);
		menuItemReferences.current[index]?.focus();
	};
	const handleMenuKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		let nextIndex: number | undefined;
		if (event.key === 'ArrowDown') {
			nextIndex = Math.min(index + 1, upgradeQualityComparators.length);
		} else if (event.key === 'ArrowUp') {
			nextIndex = Math.max(index - 1, 0);
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = upgradeQualityComparators.length;
		}
		if (nextIndex === undefined) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		focusMenuItem(nextIndex);
	};

	return createPortal(
		<div
			className="upgrade-quality-controls__menu-layer"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) {
					onCancel();
				}
			}}
		>
			<section
				ref={dialogReference}
				className="upgrade-quality-controls__menu-dialog"
				role="dialog"
				aria-modal="true"
				aria-label="Quality comparison"
				data-placement={anchor.placement}
				style={menuStyle}
			>
				<div className="upgrade-quality-controls__comparator-menu" role="menu" aria-label="Quality comparison">
					<AnyQualityPickerOption
						ref={(button) => {
							menuItemReferences.current[0] = button;
						}}
						selected={qualitySelection === 'any'}
						tabIndex={activeIndex === 0 ? 0 : -1}
						onClick={onAnyChoose}
						onFocus={() => {
							setActiveIndex(0);
						}}
						onKeyDown={(event) => {
							handleMenuKeyDown(event, 0);
						}}
					/>
					{upgradeQualityComparators.map((comparator, comparatorIndex) => (
						<button
							ref={(button) => {
								menuItemReferences.current[comparatorIndex + 1] = button;
							}}
							type="button"
							key={comparator}
							role="menuitemradio"
							aria-checked={qualitySelection !== 'any' && qualityComparator === comparator}
							tabIndex={activeIndex === comparatorIndex + 1 ? 0 : -1}
							onClick={() => {
								onComparatorChoose(comparator);
							}}
							onFocus={() => {
								setActiveIndex(comparatorIndex + 1);
							}}
							onKeyDown={(event) => {
								handleMenuKeyDown(event, comparatorIndex + 1);
							}}
						>
							{comparator}
						</button>
					))}
				</div>
			</section>
		</div>,
		document.body,
	);
}

function QualityComparatorControl({
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: {
	onComparatorChange: (comparator: QualityComparator) => void;
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuAnchor, setMenuAnchor] = useState<QualityComparatorMenuAnchor>({
		left: 0,
		placement: 'below',
		top: 0,
		width: 44,
	});
	const toggleReference = useRef<HTMLButtonElement>(null);
	const comparisonLabel = qualitySelection === 'any' ? anyQualityLabel : `Quality comparison: ${qualityComparator}`;
	const qualityCondition = qualitySelection === 'any' ? 'any' : `${qualityComparator} ${qualitySelection}`;

	return (
		<div className="upgrade-quality-controls__condition">
			<button
				ref={toggleReference}
				type="button"
				className="upgrade-quality-controls__comparator-toggle"
				aria-label={comparisonLabel}
				aria-expanded={menuOpen}
				aria-haspopup="dialog"
				data-factorio-control-style="train_schedule_circuit_condition_comparator_dropdown"
				data-quality-condition={qualityCondition}
				title={comparisonLabel}
				onClick={() => {
					const bounds = toggleReference.current?.getBoundingClientRect();
					if (bounds !== undefined) {
						const itemHeight = 28;
						const menuBorderWidth = 2;
						const menuHeight = (upgradeQualityComparators.length + 1) * itemHeight + menuBorderWidth * 2;
						const width = Math.max(bounds.width, 44);
						const left = Math.min(Math.max(bounds.left, 0), Math.max(window.innerWidth - width, 0));
						if (window.innerHeight - bounds.bottom >= menuHeight) {
							setMenuAnchor({left, placement: 'below', top: bounds.bottom, width});
						} else {
							setMenuAnchor({
								bottom: window.innerHeight - bounds.top,
								left,
								placement: 'above',
								width,
							});
						}
					}
					setMenuOpen(true);
				}}
			>
				<span className="upgrade-quality-controls__comparator-value" aria-hidden="true">
					{qualitySelection === 'any' ? <AnyQualityIcon /> : qualityComparator}
				</span>
				<span className="upgrade-quality-controls__dropdown-arrow" aria-hidden="true">
					▾
				</span>
			</button>
			{menuOpen ? (
				<QualityComparatorMenu
					anchor={menuAnchor}
					onAnyChoose={() => {
						if (qualitySelection !== 'any') {
							onQualityChange('any');
						}
						setMenuOpen(false);
					}}
					onCancel={() => {
						setMenuOpen(false);
					}}
					onComparatorChoose={(comparator) => {
						if (qualitySelection === 'any' || qualityComparator !== comparator) {
							onComparatorChange(comparator);
						}
						if (qualitySelection === 'any') {
							onQualityChange('normal');
						}
						setMenuOpen(false);
					}}
					qualityComparator={qualityComparator}
					qualitySelection={qualitySelection}
				/>
			) : null}
		</div>
	);
}

function qualityLabel(quality: ExplicitQuality): string {
	return `${upgradeQualityLabel(quality)} quality`;
}

function QualitySelector({
	onQualityChange,
	qualitySelection,
}: {
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualitySelection: UpgradeQualitySelection;
}) {
	const exactQuality = qualitySelection === 'any' ? 'normal' : qualitySelection;
	if (qualitySelectorUsesDropdown(upgradeQualities.length)) {
		return (
			<label className="upgrade-quality-controls__quality-dropdown">
				<span>Quality</span>
				<FactorioQualityBadge quality={exactQuality} aria-hidden="true" />
				<select
					aria-label="Quality"
					value={exactQuality}
					onChange={(event) => {
						onQualityChange(explicitQuality(event.currentTarget.value));
					}}
				>
					{upgradeQualities.map((quality) => (
						<option key={quality} value={quality}>
							{upgradeQualityLabel(quality)}
						</option>
					))}
				</select>
			</label>
		);
	}

	return upgradeQualities.map((quality) => {
		const label = qualityLabel(quality);
		return (
			<button
				type="button"
				className="upgrade-quality-controls__quality factorio-tool-button"
				key={quality}
				aria-label={label}
				aria-pressed={qualitySelection === quality}
				data-factorio-style="tool_button"
				title={upgradeQualitySelectionTooltip(quality)}
				onClick={() => {
					onQualityChange(quality);
				}}
			>
				<FactorioQualityBadge quality={quality} aria-hidden="true" />
			</button>
		);
	});
}

/**
 * The single quality footer used by `SignalPickerDialog`.
 *
 * Source mode models `QualityConditionGui`: an Any sentinel or ordered
 * comparator plus the shared exact selector. Target mode models `QualityGui`.
 * The exact selector uses registered visible qualities and switches to the
 * configured dropdown representation at the generated threshold.
 */
export function UpgradeQualityControls({
	mode,
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: UpgradeQualityControlsProps) {
	const modeLabel = signalName({name: mode});
	const comparatorChanged = (comparator: QualityComparator) => {
		if (onComparatorChange === undefined) {
			throw new Error('Source quality controls require a comparator change handler.');
		}
		onComparatorChange(comparator);
	};
	const qualitySelectorMode = qualitySelectorUsesDropdown(upgradeQualities.length) ? 'dropdown' : 'buttons';

	return (
		<div
			className="upgrade-quality-controls upgrade-quality-controls--picker"
			role="group"
			aria-label={`${modeLabel} quality`}
			data-quality-selector-mode={qualitySelectorMode}
		>
			{mode === 'source' ? (
				<QualityComparatorControl
					onComparatorChange={comparatorChanged}
					onQualityChange={onQualityChange}
					qualityComparator={qualityComparator}
					qualitySelection={qualitySelection}
				/>
			) : null}
			<QualitySelector onQualityChange={onQualityChange} qualitySelection={qualitySelection} />
		</div>
	);
}
