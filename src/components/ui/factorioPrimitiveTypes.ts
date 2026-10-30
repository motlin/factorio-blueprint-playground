import gameUiSpec from '../../generated/game-ui-spec.json';

export enum FactorioButtonKind {
	Neutral = 'neutral',
	Confirm = 'confirm',
	Delete = 'delete',
	Search = 'search',
	Close = 'close',
}

export enum FactorioFrameDepth {
	Shallow = 'shallow',
	Inside = 'inside',
	Deep = 'deep',
}

export enum FactorioTooltipPlacement {
	Above = 'above',
	Below = 'below',
}

export function factorioQualityLabel(quality: string): string {
	const definition = gameUiSpec.qualities.find((candidate) => candidate.name === quality);
	if (definition === undefined) {
		throw new Error(`Unknown Factorio ${gameUiSpec.sourceVersion} quality: ${quality}`);
	}
	return `${definition.label} quality`;
}
