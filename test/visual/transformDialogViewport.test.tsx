import {render} from '@testing-library/react';
import {expect, test} from 'vite-plus/test';

import {UpgradePlannerDialog} from '../../src/components/blueprint/panels/transform/UpgradePlannerDialog';
import type {BlueprintString} from '../../src/parsing/types';

import {type DialogViewportLayout, inspectDialogViewport} from './setup';

const rootBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

function renderPlannerHtml(): string {
	const container = document.createElement('div');
	const noop = () => {};
	render(
		<UpgradePlannerDialog
			breadcrumb="Root blueprint"
			canChooseRootScope={false}
			mappings={{
				candidates: [
					{
						count: 1,
						from: {type: 'entity', name: 'transport-belt'},
						preserveQuality: true,
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
				],
				error: undefined,
				excludedSources: new Set(),
				manualRules: [],
				onAddManualRule: noop,
				onChangeManualRule: noop,
				onPlannerLoad: noop,
				onPlannerInputChange: noop,
				onRemoveRule: noop,
				onTargetChange: noop,
				plannerInput: '',
				rootBlueprint,
				source: 'suggested',
				sourceLabel: 'Default Upgrade',
				sourceOptions: [
					{type: 'entity', name: 'transport-belt'},
					{type: 'entity', name: 'fast-transport-belt'},
				],
			}}
			matchCount={1}
			onClose={noop}
			onSave={noop}
			onScopeChange={noop}
			replacements={{
				iconMappingCount: 0,
				iconReplacementCount: 0,
				metadataFind: '',
				metadataReplace: '',
				metadataReplacementCount: 0,
				onIconReplacementsOpen: noop,
				onMetadataFindChange: noop,
				onMetadataReplaceChange: noop,
				onTextReplacementEnabledChange: noop,
				textReplacementEnabled: false,
			}}
			saveDisabled={false}
			scope="selection"
			selectionScopeDisabled={false}
			selectionScopeLabel="Selected blueprint"
		/>,
		{container},
	);
	return container.innerHTML.replace(
		/https:\/\/factorio-icon-cdn\.pages\.dev\/[^"]+/g,
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23666%22/%3E%3C/svg%3E',
	);
}

test('keeps the planner shell and mapping inside narrow and short viewports', async () => {
	const html = renderPlannerHtml();
	const viewports = [
		{height: 568, width: 320},
		{height: 320, width: 860},
	];
	const layouts: Array<DialogViewportLayout | undefined> = [];
	for (const viewport of viewports) {
		layouts.push(await inspectDialogViewport('transform-dialog-viewport', html, viewport));
	}
	const availableLayouts = layouts.filter((layout): layout is DialogViewportLayout => layout !== undefined);
	const expectedLayout: DialogViewportLayout = {
		bodyFitsHorizontally: true,
		bodyOwnsScrolling: true,
		dialogFitsViewport: true,
		footerVisible: true,
		headerVisible: true,
		mappingFitsHorizontally: true,
		panelBordersAligned: true,
	};

	expect(availableLayouts).toStrictEqual(availableLayouts.map(() => expectedLayout));
});
