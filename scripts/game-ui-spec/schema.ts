import {z} from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-f]{40}$/);
const sourceSchema = z.object({
	path: z.string().min(1),
	blob: objectIdSchema,
});

const priorArtSchema = z.object({
	repository: z.literal('teoxoy/factorio-blueprint-editor'),
	commit: objectIdSchema,
	license: z.literal('MIT'),
	copyright: z.literal('Copyright (c) 2020 Tanasoaia Teodor Andrei'),
	sources: z.array(sourceSchema).min(1),
});

const gameUiSourceLockSchema = z.object({
	schemaVersion: z.literal(1),
	repository: z.literal('wube/Factorio'),
	sourceVersion: z.literal('2.1.12'),
	tag: z.literal('2.1.12'),
	commit: objectIdSchema,
	sources: z.array(sourceSchema).min(1),
	priorArt: priorArtSchema,
});

const qualitySchema = z.object({
	name: z.string().min(1),
	label: z.string().min(1),
	level: z.number().int().nonnegative(),
	order: z.string().min(1),
	icon: z.string().min(1),
	hidden: z.boolean(),
	next: z.string().min(1).optional(),
});

const signalCategorySchema = z.object({
	name: z.string().min(1),
	label: z.string().min(1),
	order: z.string().min(1),
	icon: z.string().min(1),
	subgroups: z.array(
		z.object({
			name: z.string().min(1),
			order: z.string().min(1),
		}),
	),
});

const upgradeMemberSchema = z.object({
	prototypeType: z.string().min(1),
	name: z.string().min(1),
});

const gameUiSpecSchema = z.object({
	schemaVersion: z.literal(1),
	sourceVersion: z.literal('2.1.12'),
	provenance: z.object({
		repository: z.literal('wube/Factorio'),
		tag: z.literal('2.1.12'),
		commit: objectIdSchema,
		locale: z.literal('en'),
		sources: z.array(sourceSchema).min(1),
		priorArt: priorArtSchema,
	}),
	qualities: z.array(qualitySchema).min(1),
	qualityComparators: z.array(z.string().min(1)).min(1),
	labels: z.object({
		anyQuality: z.string().min(1),
		qualitySelectionTooltip: z.string().min(1),
	}),
	signals: z.object({
		typeOrder: z.array(z.string().min(1)).min(1),
		categories: z.array(signalCategorySchema).min(1),
		subgroupStartsNewRow: z.literal(true),
	}),
	upgrades: z.object({
		groups: z.array(
			z.object({
				name: z.string().min(1),
				members: z.array(upgradeMemberSchema).min(1),
			}),
		),
		next: z.array(
			z.object({
				prototypeType: z.string().min(1),
				from: z.string().min(1),
				to: z.string().min(1),
			}),
		),
	}),
	utilityConstants: z.object({
		blueprintBigSlotsPerRow: z.number().int().positive(),
		blueprintSmallSlotsPerRow: z.number().int().positive(),
		selectGroupRowCount: z.number().int().positive(),
		selectSlotRowCount: z.number().int().positive(),
		qualitySelectorDropdownThreshold: z.number().int().positive(),
	}),
	styles: z.object({
		blueprintRecordSlotPadding: z.number().int().nonnegative(),
		blueprintRecordSlotSize: z.number().int().positive(),
		defaultTableHorizontalSpacing: z.number().int().nonnegative(),
		defaultTableVerticalSpacing: z.number().int().nonnegative(),
		slotSize: z.number().int().positive(),
		filterGroupTabWidth: z.number().int().positive(),
		filterGroupTabHeight: z.number().int().positive(),
		filterSlotHorizontalSpacing: z.number().int().nonnegative(),
		filterSlotVerticalSpacing: z.number().int().nonnegative(),
		labelUnderWidgetBottomMargin: z.number().int(),
		labelUnderWidgetHeight: z.number().int().positive(),
		labelUnderWidgetTopMargin: z.number().int(),
		signalsTableColumnCount: z.number().int().positive(),
		signalsTableMinimumWidth: z.number().int().positive(),
		bindings: z.object({
			slotButton: z.string().min(1),
			filterSlotTable: z.string().min(1),
			deepSlotsScrollPane: z.string().min(1),
		}),
	}),
});

export type GameUiSourceLock = z.infer<typeof gameUiSourceLockSchema>;
export type GameUiSpec = z.infer<typeof gameUiSpecSchema>;

export function parseGameUiSourceLock(value: unknown): GameUiSourceLock {
	return gameUiSourceLockSchema.parse(value);
}

export function parseGameUiSpec(value: unknown): GameUiSpec {
	return gameUiSpecSchema.parse(value);
}
