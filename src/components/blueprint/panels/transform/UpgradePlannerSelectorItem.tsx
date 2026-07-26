import type {UpgradePlanner} from '../../../../parsing/types';
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
	index: number;
	instructionsId: string;
	onChoose: () => void;
	onFocus: () => void;
	onMoveFocus: (index: number) => void;
	selected: boolean;
}

/**
 * The editor's Load selector is a browser-only source chooser. Its tiles copy a
 * planner into the editable draft and retain Empty/Paste choices. The global
 * apply-only selector uses `BlueprintRecordViews` instead, so its library records
 * share search, List/Grid/Slots presentation, and directional activation.
 *
 * Evidence: SelectUpgradePlannerGui and BE-3 at Factorio 2.1.12.
 */
export function UpgradePlannerSelectorItem({
	active,
	buttonRef,
	choice,
	choiceCount,
	index,
	instructionsId,
	onChoose,
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
			onClick={onChoose}
			onFocus={onFocus}
			onKeyDown={(event) => {
				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
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
