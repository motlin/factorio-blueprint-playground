import {z} from 'zod';

export const canonicalViewports = [
	{name: 'desktop', width: 1200, height: 800},
	{name: 'short', width: 960, height: 360},
	{name: 'narrow', width: 320, height: 640},
] as const;

export const factorioReferenceIds = [
	'BP-01',
	'BP-02',
	'BP-03',
	'BP-04',
	'BP-05',
	'BP-06',
	'BP-07',
	'BP-08',
	'UP-01',
	'UP-02',
	'UP-03',
	'UP-04',
	'UP-05',
] as const;

const dimensionsSchema = z
	.object({
		height: z.number().int().positive(),
		width: z.number().int().positive(),
	})
	.strict();

export const referenceManifestSchema = z
	.object({
		schemaVersion: z.literal(1),
		factorio: z
			.object({
				commit: z.literal('4f08bb3d5d556d152784853c61f0996b7f11ffc9'),
				tag: z.literal('2.1.12'),
			})
			.strict(),
		references: z.array(
			z
				.object({
					description: z.string().min(1),
					dimensions: dimensionsSchema.nullable(),
					id: z.enum(factorioReferenceIds),
					logicalScaleAnchor: z.string().min(1),
					path: z.string().regex(/^\.llm\/game-ui-references\/2\.1\.12\/(?:BP|UP)-\d{2}\.png$/),
					requiredBehavior: z.array(z.string().min(1)).min(1),
					sha256: z
						.string()
						.regex(/^[a-f0-9]{64}$/)
						.nullable(),
					sourceReferences: z
						.array(
							z
								.object({
									path: z.string().min(1),
									symbols: z.array(z.string().min(1)).min(1),
								})
								.strict(),
						)
						.min(1),
					status: z.literal('missing-local-file'),
				})
				.strict(),
		),
	})
	.strict();

export const captureManifestSchema = z
	.object({
		schemaVersion: z.literal(1),
		stories: z
			.array(
				z
					.object({
						id: z.string().regex(/^[a-z0-9-]+--[a-z0-9-]+$/),
						requiredStates: z.array(
							z.enum([
								'rest',
								'hover',
								'focus',
								'pressed',
								'selected',
								'disabled',
								'empty',
								'filled',
								'error',
							]),
						),
					})
					.strict(),
			)
			.min(1),
	})
	.strict();

export type ReferenceManifest = z.infer<typeof referenceManifestSchema>;
