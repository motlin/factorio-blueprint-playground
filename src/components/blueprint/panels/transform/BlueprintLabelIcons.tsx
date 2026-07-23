import type {SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';

interface BlueprintLabelIconsProps {
	icons: readonly SignalID[];
	onChange: (icons: SignalID[]) => void;
	onChoose: (index: number) => void;
	signalTitle: (signal: SignalID) => string;
}

const labelIconIndexes = [0, 1, 2, 3] as const;

export function BlueprintLabelIcons({icons, onChange, onChoose, signalTitle}: BlueprintLabelIconsProps) {
	return labelIconIndexes.map((index) => {
		const icon = icons.at(index);
		const label = `${icon === undefined ? 'Choose' : 'Edit'} icon ${(index + 1).toString()}`;
		return (
			<button
				type="button"
				key={index}
				className={`transform-signal-slot${icon === undefined ? ' transform-signal-slot--empty' : ''}`}
				aria-label={label}
				title={icon === undefined ? label : signalTitle(icon)}
				onClick={() => {
					onChoose(index);
				}}
				onContextMenu={(event) => {
					if (icon === undefined) {
						return;
					}
					event.preventDefault();
					onChange(icons.filter((_signal, iconIndex) => iconIndex !== index));
				}}
			>
				{icon === undefined ? <span aria-hidden="true">+</span> : <FactorioIcon icon={icon} size="large" />}
			</button>
		);
	});
}
