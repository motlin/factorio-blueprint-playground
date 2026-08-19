import type {Quality, QualityComparator, SignalID} from '../../../../parsing/types';

export const upgradeQualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export const upgradeQualityComparators: readonly QualityComparator[] = ['>', '<', '=', '≥', '≤', '≠'];

export type ExplicitQuality = Exclude<Quality, undefined>;
export type UpgradeQualityMode = 'source' | 'target';
export type UpgradeQualitySelection = 'any' | ExplicitQuality;
export type UpgradeQualitySignal = SignalID & {comparator?: QualityComparator};

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
