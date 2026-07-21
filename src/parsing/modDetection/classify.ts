import type {Confidence, DetectionResult, ExtractedNames, ModDatabase, ModSource, UnknownName, Verdict} from './types';

const MAXIMUM_EXAMPLE_NAMES = 5;

interface SourceEvidence {
	names: Set<string>;
	exclusiveCount: number;
	definitive: boolean;
}

interface AmbiguousName {
	name: string;
	candidates: number[];
}

function sourceIndexes(mask: number, sourceCount: number): number[] {
	const indexes: number[] = [];
	for (let index = 0; index < sourceCount; index += 1) {
		if ((mask & (1 << index)) !== 0) {
			indexes.push(index);
		}
	}
	return indexes;
}

function evidenceFor(evidence: Map<number, SourceEvidence>, sourceIndex: number): SourceEvidence {
	const existing = evidence.get(sourceIndex);
	if (existing) {
		return existing;
	}

	const created: SourceEvidence = {names: new Set(), exclusiveCount: 0, definitive: false};
	evidence.set(sourceIndex, created);
	return created;
}

function versionMajor(version: string | undefined): number | undefined {
	if (version === undefined) {
		return undefined;
	}
	return Number.parseInt(version.split('.')[0] ?? '', 10);
}

function selectBaseSource(indexes: number[], sources: ModSource[], version: string | undefined): number | undefined {
	const baseIndexes = indexes.filter((index) => sources[index]?.id === 'base' || sources[index]?.id === 'base-1.1');
	if (baseIndexes.length === 0) {
		return undefined;
	}

	const preferredId = (versionMajor(version) ?? 2) < 2 ? 'base-1.1' : 'base';
	return baseIndexes.find((index) => sources[index]?.id === preferredId) ?? baseIndexes[0];
}

function assignAmbiguousNames(ambiguousNames: AmbiguousName[], evidence: Map<number, SourceEvidence>): void {
	const chosenSources = new Set(evidence.keys());
	const remaining = [...ambiguousNames];

	while (remaining.length > 0) {
		const explainedIndex = remaining.findIndex((entry) =>
			entry.candidates.some((candidate) => chosenSources.has(candidate)),
		);
		if (explainedIndex >= 0) {
			const [entry] = remaining.splice(explainedIndex, 1);
			const sourceIndex = entry.candidates
				.filter((candidate) => chosenSources.has(candidate))
				.sort((left, right) => {
					const exclusiveDifference =
						(evidence.get(right)?.exclusiveCount ?? 0) - (evidence.get(left)?.exclusiveCount ?? 0);
					return exclusiveDifference || left - right;
				})
				.at(0);
			if (sourceIndex === undefined) {
				throw new Error(`No selected source can explain ambiguous name: ${entry.name}`);
			}
			evidenceFor(evidence, sourceIndex).names.add(entry.name);
			continue;
		}

		const coverage = new Map<number, number>();
		for (const entry of remaining) {
			for (const candidate of entry.candidates) {
				coverage.set(candidate, (coverage.get(candidate) ?? 0) + 1);
			}
		}
		const sourceIndex = [...coverage.keys()]
			.sort((left, right) => {
				const coverageDifference = (coverage.get(right) ?? 0) - (coverage.get(left) ?? 0);
				const exclusiveDifference =
					(evidence.get(right)?.exclusiveCount ?? 0) - (evidence.get(left)?.exclusiveCount ?? 0);
				return coverageDifference || exclusiveDifference || left - right;
			})
			.at(0);
		if (sourceIndex === undefined) {
			throw new Error('No source can explain the remaining ambiguous names.');
		}
		chosenSources.add(sourceIndex);
		evidenceFor(evidence, sourceIndex);
	}
}

function confidenceFor(evidence: SourceEvidence): Confidence {
	if (evidence.definitive || evidence.exclusiveCount >= 3) {
		return 'high';
	}
	return 'medium';
}

function verdictFor(source: ModSource, evidence: SourceEvidence): Verdict {
	const sortedNames = [...evidence.names].sort();
	return {
		source: source.id,
		label: source.label,
		confidence: confidenceFor(evidence),
		matchCount: sortedNames.length,
		exampleNames: sortedNames.slice(0, MAXIMUM_EXAMPLE_NAMES),
	};
}

function prefixHint(name: string, prefixes: ModDatabase['prefixes']): string | undefined {
	return Object.entries(prefixes)
		.filter(([prefix]) => name.startsWith(prefix))
		.sort(([left], [right]) => right.length - left.length || left.localeCompare(right))[0]?.[1];
}

function warningForVersion(
	version: string | undefined,
	selectedSourceIndexes: Set<number>,
	sources: ModSource[],
): string[] {
	if ((versionMajor(version) ?? 2) >= 2 || version === undefined) {
		return [];
	}

	return [...selectedSourceIndexes]
		.filter((sourceIndex) => sources[sourceIndex]?.dlc === true)
		.sort((left, right) => left - right)
		.map(
			(sourceIndex) =>
				`Blueprint version ${version} predates Factorio 2.0, but ${sources[sourceIndex]?.label} evidence is present.`,
		);
}

function addDefinitiveEvidence(
	extractedNames: ExtractedNames,
	database: ModDatabase,
	evidence: Map<number, SourceEvidence>,
) {
	const definitiveSourceIds = new Set<string>();
	if (extractedNames.flags.hasNonNormalQuality) {
		definitiveSourceIds.add('quality');
	}
	if (extractedNames.flags.hasPlanetSignals || extractedNames.flags.hasSpaceLocationSignals) {
		definitiveSourceIds.add('space-age');
	}
	for (let sourceIndex = 0; sourceIndex < database.sources.length; sourceIndex += 1) {
		if (definitiveSourceIds.has(database.sources[sourceIndex]?.id ?? '')) {
			evidenceFor(evidence, sourceIndex).definitive = true;
		}
	}
}

export function classify(extractedNames: ExtractedNames, database: ModDatabase): DetectionResult {
	const evidence = new Map<number, SourceEvidence>();
	const ambiguousNames: AmbiguousName[] = [];
	const unknownNames: UnknownName[] = [];

	for (const name of [...extractedNames.names.keys()].sort()) {
		const mask = database.names[name];
		if (mask === undefined) {
			unknownNames.push({name, prefixHint: prefixHint(name, database.prefixes)});
			continue;
		}

		const indexes = sourceIndexes(mask, database.sources.length);
		const baseSourceIndex = selectBaseSource(indexes, database.sources, extractedNames.version);
		if (baseSourceIndex !== undefined) {
			const baseEvidence = evidenceFor(evidence, baseSourceIndex);
			baseEvidence.names.add(name);
			baseEvidence.definitive = true;
			continue;
		}

		if (indexes.length === 1) {
			const sourceEvidence = evidenceFor(evidence, indexes[0]);
			sourceEvidence.names.add(name);
			sourceEvidence.exclusiveCount += 1;
			sourceEvidence.definitive = database.sources[indexes[0]]?.editor === true;
			continue;
		}

		if (indexes.length > 1) {
			ambiguousNames.push({name, candidates: indexes});
		} else {
			unknownNames.push({name, prefixHint: prefixHint(name, database.prefixes)});
		}
	}

	addDefinitiveEvidence(extractedNames, database, evidence);
	assignAmbiguousNames(ambiguousNames, evidence);

	const verdicts = [...evidence.entries()]
		.sort(([left], [right]) => left - right)
		.map(([sourceIndex, sourceEvidence]) => verdictFor(database.sources[sourceIndex], sourceEvidence));

	const prefixGroups = new Map<string, string[]>();
	for (const unknownName of unknownNames) {
		if (unknownName.prefixHint !== undefined) {
			const group = prefixGroups.get(unknownName.prefixHint) ?? [];
			group.push(unknownName.name);
			prefixGroups.set(unknownName.prefixHint, group);
		}
	}
	for (const [label, matchedNames] of prefixGroups) {
		if (verdicts.some((verdict) => verdict.label === label)) {
			continue;
		}
		const source = database.sources.find((candidate) => candidate.label === label);
		verdicts.push({
			source: source?.id ?? label,
			label,
			confidence: 'low',
			matchCount: matchedNames.length,
			exampleNames: matchedNames.sort().slice(0, MAXIMUM_EXAMPLE_NAMES),
		});
	}

	return {
		verdicts,
		unknownNames,
		warnings: warningForVersion(extractedNames.version, new Set(evidence.keys()), database.sources),
	};
}
