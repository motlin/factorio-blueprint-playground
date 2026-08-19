import {useCallback, useMemo, useState} from 'react';

import type {BlueprintString, Parameter, SignalID} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {
	applyBlueprintEditorMetadata,
	applyBlueprintParameters,
	applyBlueprintSnapGrid,
	blueprintEditorMetadata,
	blueprintParameters,
	blueprintSnapGrid,
	type BlueprintSnapGrid,
} from '../../../../transform/blueprintEditor';
import {type BlueprintComponentRemovalKey, removeBlueprintComponents} from '../../../../transform/componentRemoval';
import {stripEntities, stripModules, stripTiles, stripTrains} from '../../../../transform/strip';
import type {PlacedUpgradePlanner} from './BlueprintEditorToolbar';

interface UseBlueprintEditorDraftOptions {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath: string;
}

function sourceMetadata(blueprint: BlueprintString | undefined) {
	if (blueprint === undefined || (blueprint.blueprint === undefined && blueprint.blueprint_book === undefined)) {
		return {description: '', icons: [], label: ''};
	}
	return blueprintEditorMetadata(blueprint);
}

export function useBlueprintEditorDraft({blueprint, rootBlueprint, selectedPath}: UseBlueprintEditorDraftOptions) {
	const metadata = useMemo(() => sourceMetadata(blueprint), [blueprint]);
	const sourceIcons = useMemo(
		() => [...metadata.icons].sort((left, right) => left.index - right.index).map((icon) => icon.signal),
		[metadata.icons],
	);
	const sourceSnapGrid = useMemo(
		() => (blueprint?.blueprint === undefined ? undefined : blueprintSnapGrid(blueprint)),
		[blueprint],
	);
	const sourceParameters = useMemo(
		() => (blueprint?.blueprint === undefined ? [] : blueprintParameters(blueprint)),
		[blueprint],
	);
	const [blueprintEditorOpen, setBlueprintEditorOpen] = useState(false);
	const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
	const [editorLabel, setEditorLabel] = useState(metadata.label);
	const [editorDescription, setEditorDescription] = useState(metadata.description);
	const [editorIcons, setEditorIcons] = useState<SignalID[]>(sourceIcons);
	const [editorSnapGrid, setEditorSnapGrid] = useState<BlueprintSnapGrid | undefined>(sourceSnapGrid);
	const [editorParameters, setEditorParameters] = useState<Parameter[]>(sourceParameters);
	const [editorIconPickerIndex, setEditorIconPickerIndex] = useState<number>();
	const [editorPlacedPlanner, setEditorPlacedPlanner] = useState<PlacedUpgradePlanner>();
	const [editorPlannerDropError, setEditorPlannerDropError] = useState<string>();
	const [removedEditorComponents, setRemovedEditorComponents] = useState<Set<BlueprintComponentRemovalKey>>(
		() => new Set(),
	);
	const [stripEntitiesSelected, setStripEntitiesSelected] = useState(false);
	const [stripModulesSelected, setStripModulesSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
	const [flattenBookSelected, setFlattenBookSelected] = useState(false);
	const [sortBookSelected, setSortBookSelected] = useState(false);

	const resetBlueprintEditorDraft = useCallback(() => {
		setEditorLabel(metadata.label);
		setEditorDescription(metadata.description);
		setEditorIcons(sourceIcons);
		setEditorSnapGrid(sourceSnapGrid);
		setEditorParameters(sourceParameters);
		setEditorIconPickerIndex(undefined);
		setEditorPlacedPlanner(undefined);
		setEditorPlannerDropError(undefined);
		setRemovedEditorComponents(new Set());
		setStripEntitiesSelected(false);
		setStripModulesSelected(false);
		setStripTrainsSelected(false);
		setStripTilesSelected(false);
		setFlattenBookSelected(false);
		setSortBookSelected(false);
	}, [metadata.description, metadata.label, sourceIcons, sourceParameters, sourceSnapGrid]);

	const editorDirty = useMemo(
		() =>
			editorLabel !== metadata.label ||
			editorDescription !== metadata.description ||
			JSON.stringify(editorIcons) !== JSON.stringify(sourceIcons) ||
			JSON.stringify(editorSnapGrid) !== JSON.stringify(sourceSnapGrid) ||
			JSON.stringify(editorParameters) !== JSON.stringify(sourceParameters) ||
			removedEditorComponents.size > 0 ||
			stripEntitiesSelected ||
			stripModulesSelected ||
			stripTrainsSelected ||
			stripTilesSelected ||
			flattenBookSelected ||
			sortBookSelected,
		[
			editorDescription,
			editorIcons,
			editorLabel,
			editorParameters,
			editorSnapGrid,
			flattenBookSelected,
			metadata.description,
			metadata.label,
			removedEditorComponents,
			sortBookSelected,
			sourceIcons,
			sourceParameters,
			sourceSnapGrid,
			stripEntitiesSelected,
			stripModulesSelected,
			stripTilesSelected,
			stripTrainsSelected,
		],
	);

	const editorDraft = useMemo(() => {
		if (blueprint === undefined || rootBlueprint === undefined) {
			return {rootBlueprint: undefined, selectedBlueprint: undefined};
		}
		if (!blueprintEditorOpen) {
			return {rootBlueprint, selectedBlueprint: blueprint};
		}
		let selectedBlueprint = blueprint;
		if (selectedBlueprint.blueprint !== undefined || selectedBlueprint.blueprint_book !== undefined) {
			selectedBlueprint = applyBlueprintEditorMetadata(selectedBlueprint, {
				description: editorDescription,
				icons: editorIcons.map((signal, index) => ({index: index + 1, signal})),
				label: editorLabel,
			});
		}
		if (selectedBlueprint.blueprint !== undefined && editorSnapGrid !== undefined) {
			selectedBlueprint = applyBlueprintSnapGrid(selectedBlueprint, editorSnapGrid);
		}
		if (selectedBlueprint.blueprint !== undefined) {
			selectedBlueprint = applyBlueprintParameters(selectedBlueprint, editorParameters);
		}
		selectedBlueprint = removeBlueprintComponents(selectedBlueprint, removedEditorComponents);
		if (stripTrainsSelected) selectedBlueprint = stripTrains(selectedBlueprint);
		if (stripEntitiesSelected) selectedBlueprint = stripEntities(selectedBlueprint);
		if (stripModulesSelected) selectedBlueprint = stripModules(selectedBlueprint);
		if (stripTilesSelected) selectedBlueprint = stripTiles(selectedBlueprint);
		if (flattenBookSelected) selectedBlueprint = flattenBook(selectedBlueprint);
		if (sortBookSelected) selectedBlueprint = sortBookByLabel(selectedBlueprint);
		return {
			rootBlueprint: updateNestedBlueprint(rootBlueprint, selectedPath, () => selectedBlueprint) ?? undefined,
			selectedBlueprint,
		};
	}, [
		blueprint,
		blueprintEditorOpen,
		editorDescription,
		editorIcons,
		editorLabel,
		editorParameters,
		editorSnapGrid,
		flattenBookSelected,
		removedEditorComponents,
		rootBlueprint,
		selectedPath,
		sortBookSelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
	]);

	const openBlueprintEditor = useCallback(() => {
		resetBlueprintEditorDraft();
		setCloseConfirmationOpen(false);
		setBlueprintEditorOpen(true);
	}, [resetBlueprintEditorDraft]);
	const requestCloseBlueprintEditor = useCallback(() => {
		if (editorDirty) {
			setCloseConfirmationOpen(true);
		} else {
			setBlueprintEditorOpen(false);
		}
	}, [editorDirty]);
	const keepEditingBlueprint = useCallback(() => {
		setCloseConfirmationOpen(false);
	}, []);
	const discardBlueprintEditorDraft = useCallback(() => {
		resetBlueprintEditorDraft();
		setCloseConfirmationOpen(false);
		setBlueprintEditorOpen(false);
	}, [resetBlueprintEditorDraft]);
	const closeBlueprintEditor = useCallback(() => {
		setCloseConfirmationOpen(false);
		setBlueprintEditorOpen(false);
	}, []);

	return {
		blueprintEditorOpen,
		closeConfirmationOpen,
		closeBlueprintEditor,
		discardBlueprintEditorDraft,
		editorDescription,
		editorDirty,
		editorDraft,
		editorIconPickerIndex,
		editorIcons,
		editorLabel,
		editorParameters,
		editorPlacedPlanner,
		editorPlannerDropError,
		editorSnapGrid,
		flattenBookSelected,
		keepEditingBlueprint,
		openBlueprintEditor,
		removedEditorComponents,
		requestCloseBlueprintEditor,
		setEditorDescription,
		setEditorIconPickerIndex,
		setEditorIcons,
		setEditorLabel,
		setEditorParameters,
		setEditorPlacedPlanner,
		setEditorPlannerDropError,
		setEditorSnapGrid,
		setFlattenBookSelected,
		setRemovedEditorComponents,
		setSortBookSelected,
		setStripEntitiesSelected,
		setStripModulesSelected,
		setStripTilesSelected,
		setStripTrainsSelected,
		sortBookSelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
	};
}
