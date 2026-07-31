import {render} from '@testing-library/react';
import {expect, test} from 'vite-plus/test';

import {BlueprintEditorDialog} from '../../src/components/blueprint/panels/transform/BlueprintEditorDialog';
import {BlueprintLabelIcons} from '../../src/components/blueprint/panels/transform/BlueprintLabelIcons';
import {UpgradePlannerDialog} from '../../src/components/blueprint/panels/transform/UpgradePlannerDialog';
import {
	BlueprintEditorCommitActionKind,
	BlueprintEditorCommitState,
} from '../../src/components/blueprint/panels/transform/useBlueprintEditorDraft';
import type {BlueprintString} from '../../src/parsing/types';
import {BlueprintEditorSourceMode} from '../../src/transform/blueprintEditor';
import {blueprintFilterAnalysis} from '../../src/transform/strip';

import {
	type BlueprintEditorViewportLayout,
	type DialogViewportLayout,
	inspectBlueprintEditorViewport,
	inspectDialogViewport,
} from './setup';

const rootBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
		],
		tiles: [{name: 'concrete', position: {x: 0, y: 0}}],
	},
};

function renderBlueprintEditorHtml(): string {
	const container = document.createElement('div');
	const noop = () => {};
	render(
		<BlueprintEditorDialog
			blueprint={rootBlueprint}
			book={false}
			bookOperationSelected={false}
			breadcrumb="Root blueprint"
			closeConfirmationOpen={false}
			commitAction={{
				caption: 'Save blueprint',
				kind: BlueprintEditorCommitActionKind.SaveRoot,
				scopeDescription: 'Saves changes to this loaded root blueprint.',
			}}
			commitState={BlueprintEditorCommitState.Ready}
			context={{
				caption: 'Blueprint item',
				contextLabel: 'Existing blueprint',
			}}
			description="A deterministic Blueprint Editor viewport fixture."
			filterAnalysis={blueprintFilterAnalysis(rootBlueprint, BlueprintEditorSourceMode.ExistingRecord)}
			flattenBookSelected={false}
			icons={
				<BlueprintLabelIcons
					icons={[{type: 'item', name: 'iron-plate'}]}
					itemName="blueprint"
					onChange={noop}
					onChoose={noop}
					signalTitle={(signal) => `${signal.type ?? 'item'}:${signal.name}`}
				/>
			}
			label="Viewport blueprint"
			onApplyPlacedPlanner={noop}
			onApplyPlannerChoice={noop}
			onClearPlacedPlanner={noop}
			onClose={noop}
			onComponentRemovedChange={noop}
			onCommit={noop}
			onDescriptionChange={noop}
			onDiscard={noop}
			onDropPlanner={noop}
			onEntitiesIncludedChange={noop}
			onFlattenBookSelectedChange={noop}
			onFuelIncludedChange={noop}
			onKeepEditing={noop}
			onLabelChange={noop}
			onModulesIncludedChange={noop}
			onParametersChange={noop}
			onSnapGridChange={noop}
			onSortBookSelectedChange={noop}
			onStationNamesIncludedChange={noop}
			onTilesIncludedChange={noop}
			onTrainsIncludedChange={noop}
			onVehiclesIncludedChange={noop}
			parameters={[]}
			plannerDropError={undefined}
			placedPlanner={undefined}
			removedComponents={new Set()}
			rootBlueprint={rootBlueprint}
			signalOptions={[{type: 'item', name: 'iron-plate'}]}
			snapGrid={{
				absolute: false,
				enabled: true,
				height: 2,
				positionX: 0,
				positionY: 0,
				width: 2,
			}}
			sortBookSelected={false}
			stripEntitiesSelected={false}
			stripFuelSelected={false}
			stripModulesSelected={false}
			stripStationNamesSelected={false}
			stripTilesSelected={false}
			stripTrainsSelected={false}
			stripVehiclesSelected={false}
		/>,
		{container},
	);
	return container.innerHTML.replace(
		/https:\/\/factorio-icon-cdn\.pages\.dev\/[^"]+/g,
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23666%22/%3E%3C/svg%3E',
	);
}

function renderPlannerHtml(): string {
	const container = document.createElement('div');
	const noop = () => {};
	render(
		<UpgradePlannerDialog
			breadcrumb="Root blueprint"
			canChooseRootScope={false}
			mappings={{
				mappings: [
					{
						count: 1,
						from: {type: 'entity', name: 'transport-belt'},
						mappingId: 'mapping-belt',
						slotIndex: 0,
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
				],
				error: undefined,
				onClearEndpoint: noop,
				onMove: noop,
				onPlannerLoad: noop,
				onPlannerInputChange: noop,
				onSourceChange: noop,
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
			onApply={noop}
			onClose={noop}
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
			recordMetadata={{
				description: '',
				icons: [],
				label: 'Default Upgrade',
				onDescriptionChange: noop,
				onIconsChange: noop,
				onLabelChange: noop,
			}}
			recordTools={{
				deleteKind: 'local',
				onCopy: async () => {
					await Promise.resolve();
					return true;
				},
				onDelete: async () => {
					await Promise.resolve();
				},
				onExport: noop,
			}}
			saveDisabled={false}
			savePrompt={{
				label: 'Default Upgrade',
				onCancel: noop,
				onOpen: noop,
				onSaveAsNew: noop,
				open: false,
				pending: false,
			}}
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
	expect(html.match(/upgrade-planner-dialog__scroll-region/g)?.length).toBe(1);
	const viewports = [
		{height: 800, width: 1200},
		{height: 360, width: 960},
		{height: 640, width: 320},
	];
	const layouts: Array<DialogViewportLayout | undefined> = [];
	for (const viewport of viewports) {
		layouts.push(await inspectDialogViewport('transform-dialog-viewport', html, viewport));
	}
	const availableLayouts = layouts.filter((layout): layout is DialogViewportLayout => layout !== undefined);
	const expectedLayout: DialogViewportLayout = {
		backdropCoversViewport: true,
		bodyFitsHorizontally: true,
		bodyOwnsScrolling: true,
		closeControlMatchesPriorArt: true,
		dialogFaceMatchesPriorArt: true,
		dialogFitsViewport: true,
		footerVisible: true,
		headerVisible: true,
		mapperOwnsHorizontalScrolling: true,
		mappingSourceWidthHonored: true,
		panelInsetsPreserved: true,
		singleMapperScrollRegion: true,
		titleColorMatchesPriorArt: true,
	};

	expect(availableLayouts).toStrictEqual(availableLayouts.map(() => expectedLayout));
});

test('keeps the source-sized Blueprint Editor settings pane inside narrow and short viewports', async () => {
	const html = renderBlueprintEditorHtml();
	expect(html.match(/blueprint-editor__settings-scroll/g)?.length).toBe(1);
	expect(html).not.toContain('data-blueprint-preview');
	const viewports = [
		{height: 800, width: 1200},
		{height: 360, width: 960},
		{height: 640, width: 320},
	];
	const layouts: Array<BlueprintEditorViewportLayout | undefined> = [];
	for (const viewport of viewports) {
		layouts.push(await inspectBlueprintEditorViewport('blueprint-editor-viewport', html, viewport));
	}
	const availableLayouts = layouts.filter((layout): layout is BlueprintEditorViewportLayout => layout !== undefined);
	const expectedLayout: BlueprintEditorViewportLayout = {
		backdropCoversViewport: true,
		bodyFitsHorizontally: true,
		dialogFitsViewport: true,
		footerVisible: true,
		headerVisible: true,
		noPreviewRegion: true,
		settingsFitsHorizontally: true,
		settingsOwnsScrolling: true,
		settingsSourceWidthHonored: true,
		titleRowStaysOutsideScrollPane: true,
	};

	expect(availableLayouts).toStrictEqual(availableLayouts.map(() => expectedLayout));
});
