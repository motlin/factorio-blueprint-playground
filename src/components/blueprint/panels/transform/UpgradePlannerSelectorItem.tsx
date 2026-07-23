import type {UpgradePlanner} from '../../../../parsing/types';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';

export interface UpgradePlannerChoice {
	label: string;
	planner?: UpgradePlanner;
	source: string;
}

interface UpgradePlannerSelectorItemProps {
	active: boolean;
	buttonRef: (button: HTMLButtonElement | null) => void;
	choice: UpgradePlannerChoice;
	choiceCount: number;
	directional: boolean;
	index: number;
	instructionsId: string;
	onApply: (direction: UpgradeDirection) => void;
	onFocus: () => void;
	onMoveFocus: (index: number) => void;
	selected: boolean;
}

export function UpgradePlannerSelectorItem({
	active,
	buttonRef,
	choice,
	choiceCount,
	directional,
	index,
	instructionsId,
	onApply,
	onFocus,
	onMoveFocus,
	selected,
}: UpgradePlannerSelectorItemProps) {
	return (
		<button
			ref={buttonRef}
			type="button"
			className="upgrade-planner-selector__tile"
			aria-label={choice.label}
			aria-describedby={instructionsId}
			aria-pressed={selected}
			tabIndex={active ? 0 : -1}
			title={choice.label}
			onClick={() => {
				onApply('upgrade');
			}}
			onContextMenu={
				directional
					? (event) => {
							event.preventDefault();
							onApply('downgrade');
						}
					: undefined
			}
			onFocus={onFocus}
			onKeyDown={(event) => {
				if (directional && event.key === 'Enter' && event.shiftKey) {
					event.preventDefault();
					onApply('downgrade');
				} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
					event.preventDefault();
					onMoveFocus(index + 1);
				} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
					event.preventDefault();
					onMoveFocus(index - 1);
				} else if (event.key === 'Home') {
					event.preventDefault();
					onMoveFocus(0);
				} else if (event.key === 'End') {
					event.preventDefault();
					onMoveFocus(choiceCount - 1);
				}
			}}
		>
			<span className="upgrade-planner-selector__icon" aria-hidden="true">
				<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
			</span>
			<span>{choice.label}</span>
		</button>
	);
}
