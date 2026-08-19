import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

import {factorioReferenceIds, referenceManifestSchema, type ReferenceManifest} from './config';

const manifestPath = new URL('reference-manifest.json', import.meta.url);

export async function readReferenceManifest(): Promise<ReferenceManifest> {
	const manifest = referenceManifestSchema.parse(JSON.parse(await fs.readFile(manifestPath, 'utf8')));
	const expectedIds = [...factorioReferenceIds];
	const actualIds = manifest.references.map(({id}) => id);
	if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
		throw new Error(`Reference manifest IDs must be exactly ${expectedIds.join(', ')} in canonical order.`);
	}
	for (const reference of manifest.references) {
		const expectedPath = `.llm/game-ui-references/2.1.12/${reference.id}.png`;
		if (reference.path !== expectedPath) {
			throw new Error(`${reference.id} must use the ignored local path ${expectedPath}.`);
		}
	}
	return manifest;
}

async function validateLocalFile(
	reference: ReferenceManifest['references'][number],
	repositoryRoot: string,
	requireLocalReferences: boolean,
): Promise<void> {
	const absolutePath = path.resolve(repositoryRoot, reference.path);
	let bytes: Buffer;
	try {
		bytes = await fs.readFile(absolutePath);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT' && !requireLocalReferences) {
			return;
		}
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			throw new Error(`${reference.id} is unavailable: expected the ignored file ${reference.path}.`);
		}
		throw error;
	}

	if (reference.sha256 === null || reference.dimensions === null) {
		throw new Error(
			`${reference.id} exists locally, but its SHA-256 and dimensions are intentionally unrecorded. ` +
				'Record verified metadata before requesting a game-reference comparison.',
		);
	}
	const actualHash = createHash('sha256').update(bytes).digest('hex');
	if (actualHash !== reference.sha256) {
		throw new Error(`${reference.id} SHA-256 mismatch for ${reference.path}.`);
	}
	const metadata = await sharp(bytes).metadata();
	const actualDimensions = {height: metadata.height, width: metadata.width};
	if (
		actualDimensions.height !== reference.dimensions.height ||
		actualDimensions.width !== reference.dimensions.width
	) {
		throw new Error(
			`${reference.id} dimensions mismatch: expected ${reference.dimensions.width.toString()}×${reference.dimensions.height.toString()}, ` +
				`received ${String(actualDimensions.width)}×${String(actualDimensions.height)}.`,
		);
	}
}

export async function validateReferences(requireLocalReferences: boolean): Promise<void> {
	const manifest = await readReferenceManifest();
	const repositoryRoot = path.resolve(import.meta.dirname, '../..');
	for (const reference of manifest.references) {
		await validateLocalFile(reference, repositoryRoot, requireLocalReferences);
	}
}

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const argumentsList = process.argv.slice(2);
	if (
		argumentsList.some((argument) => argument !== '--require-local-references') ||
		argumentsList.filter((argument) => argument === '--require-local-references').length > 1
	) {
		throw new Error('Usage: validate-references.ts [--require-local-references]');
	}

	const requireLocalReferences = argumentsList.includes('--require-local-references');
	await validateReferences(requireLocalReferences);
	console.log(
		requireLocalReferences
			? 'Validated all local Factorio reference files.'
			: 'Validated the NDA-safe reference manifest; missing local reference files were not required.',
	);
}
