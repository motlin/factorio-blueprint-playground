import type {LintRule} from '../types';

export const emptyBlueprintRule: LintRule = {
	id: 'empty-blueprint',
	severity: 'info',
	run(context) {
		if (context.entities.length > 0 || (context.blueprint.tiles?.length ?? 0) > 0) return [];

		return [
			{
				ruleId: this.id,
				severity: this.severity,
				message: 'Blueprint contains no entities or tiles.',
				entityNumbers: [],
			},
		];
	},
};
