import type {Quality, QualityComparator, SignalID} from '../../../../parsing/types';
import gameUiSpec from '../../../../generated/game-ui-spec.json';

export type ExplicitQuality = Exclude<Quality, undefined>;
export type UpgradeQualityMode = 'source' | 'target';
export type UpgradeQualitySelection = 'any' | ExplicitQuality;
export type UpgradeQualitySignal = SignalID & {comparator?: QualityComparator};

function explicitQuality(name: string): ExplicitQuality {
	switch (name) {
		case 'normal':
		case 'uncommon':
		case 'rare':
		case 'epic':
		case 'legendary':
			return name;
		default:
			throw new Error(`Generated game UI specification contains unsupported quality ${name}.`);
	}
}

function qualityComparator(value: string): QualityComparator {
	switch (value) {
		case '=':
		case '!=':
		case '<':
		case '<=':
		case '>':
		case '>=':
		case '≠':
		case '≤':
		case '≥':
			return value;
		default:
			throw new Error(`Generated game UI specification contains unsupported quality comparator ${value}.`);
	}
}

export const upgradeQualities = gameUiSpec.qualities.map(({name}) => explicitQuality(name));
export const upgradeQualityComparators = gameUiSpec.qualityComparators.map((value) => qualityComparator(value));
export const anyQualityLabel = gameUiSpec.labels.anyQuality;

export function upgradeQualityLabel(quality: ExplicitQuality): string {
	const label = gameUiSpec.qualities.find(({name}) => name === quality)?.label;
	if (label === undefined) {
		throw new Error(`Generated game UI specification has no label for quality ${quality}.`);
	}
	return label;
}

/**
 * Blueprint boundary for the canonical picker contract in
 * `SignalPickerDialog`: `any` is UI state for an absent source
 * `QualityCondition`, never a serialized SignalID quality. Exact target quality
 * carries no comparator; source comparator and quality are serialized together.
 */
export function signalWithUpgradeQuality(
	signal: UpgradeQualitySignal,
	mode: UpgradeQualityMode,
	qualitySelection: UpgradeQualitySelection,
	qualityComparator: QualityComparator,
): UpgradeQualitySignal {
	const selectedSignal: UpgradeQualitySignal = {...signal};
	delete selectedSignal.comparator;
	delete selectedSignal.quality;
	if (qualitySelection === 'any') {
		if (mode === 'target') {
			throw new Error('Target quality selection must be explicit.');
		}
		return selectedSignal;
	}
	selectedSignal.quality = qualitySelection;
	if (mode === 'source') {
		selectedSignal.comparator = qualityComparator;
	}
	return selectedSignal;
}
