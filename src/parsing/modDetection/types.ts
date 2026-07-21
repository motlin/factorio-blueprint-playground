export type NameKind = 'signal' | 'entity' | 'recipe' | 'item' | 'tile' | 'any';

export interface ExtractedName {
	kinds: Set<NameKind>;
	count: number;
}

export interface ExtractionFlags {
	hasNonNormalQuality: boolean;
	hasPlanetSignals: boolean;
	hasSpaceLocationSignals: boolean;
}

export interface ExtractedNames {
	names: Map<string, ExtractedName>;
	flags: ExtractionFlags;
	version: string | undefined;
}

export interface ModSource {
	id: string;
	label: string;
	dlc?: boolean;
	mods?: Partial<Record<string, string>>;
}

export interface ModDatabase {
	generatedAt: string;
	factoriolabCommit: string;
	license: string;
	sources: ModSource[];
	names: Partial<Record<string, number>>;
	prefixes: Record<string, string>;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface Verdict {
	source: string;
	label: string;
	confidence: Confidence;
	matchCount: number;
	exampleNames: string[];
}

export interface UnknownName {
	name: string;
	prefixHint: string | undefined;
}

export interface DetectionResult {
	verdicts: Verdict[];
	unknownNames: UnknownName[];
	warnings: string[];
}
