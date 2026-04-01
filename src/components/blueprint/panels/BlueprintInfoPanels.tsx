import {getRouteApi, useNavigate} from '@tanstack/react-router';
import {Pencil, Save, X} from 'lucide-react';
import {memo, useCallback, useState} from 'react';

import {type BlueprintInfo, BlueprintWrapper} from '../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../parsing/blueprintParser';
import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../../parsing/nestedBlueprintEditor';
import type {BlueprintString} from '../../../parsing/types';
import {addBlueprint} from '../../../state/blueprintLocalStorage';
import type {BlueprintGameData, DatabaseBlueprintType} from '../../../storage/db';
import {Button} from '../../ui/Button';
import {ButtonGreen} from '../../ui/ButtonGreen';

import {ContentsPanel} from './contents/ContentsPanel';
import {DeconstructionPlannerPanel} from './deconstruction/DeconstructionPlannerPanel';
import {LintPanel} from './lint/LintPanel';
import {BasicInfoPanel} from './info/BasicInfoPanel';
import {ModDetectionPanel} from './mod-detection/ModDetectionPanel';
import {UpgradePlannerPanel} from './upgrade/UpgradePlannerPanel';

const routeApi = getRouteApi('/');

const getUpdatedBlueprint = (
	blueprint: BlueprintString,
	label: string,
	description: string,
	selectedPath?: string,
	rootBlueprint?: BlueprintString,
): BlueprintString | null => {
	if (selectedPath != null && selectedPath !== '' && rootBlueprint != null) {
		const updater = createLabelDescriptionUpdater(label, description);
		return updateNestedBlueprint(rootBlueprint, selectedPath, updater);
	}

	const wrapper = new BlueprintWrapper(blueprint);
	wrapper.updateLabel(label);
	wrapper.updateDescription(description);
	return wrapper.getRawBlueprint();
};

const getBlueprintGameData = (blueprint: BlueprintString): BlueprintGameData => {
	const info = new BlueprintWrapper(blueprint).getInfo();
	const typeMap: Record<BlueprintInfo['type'], DatabaseBlueprintType> = {
		blueprint: 'blueprint',
		'blueprint-book': 'blueprint_book',
		'upgrade-planner': 'upgrade_planner',
		'deconstruction-planner': 'deconstruction_planner',
	};
	return {
		type: typeMap[info.type],
		label: info.label,
		description: info.description,
		gameVersion: info.version.toString(),
		icons: (info.icons ?? []).map((icon) => ({
			type: icon.signal.type,
			name: icon.signal.name,
		})),
	};
};

interface BlueprintInfoPanelsProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
	onSelect?: (path: string) => void;
}

const BlueprintInfoPanelsComponent = ({blueprint, rootBlueprint, selectedPath, onSelect}: BlueprintInfoPanelsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedLabel, setEditedLabel] = useState('');
	const [editedDescription, setEditedDescription] = useState('');
	const [hasPendingChanges, setHasPendingChanges] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const navigate = useNavigate({from: routeApi.id});

	const handleLabelEdit = useCallback((newLabel: string) => {
		setEditedLabel(newLabel);
		setHasPendingChanges(true);
	}, []);

	const handleDescriptionEdit = useCallback((newDescription: string) => {
		setEditedDescription(newDescription);
		setHasPendingChanges(true);
	}, []);

	const startEditing = useCallback(() => {
		if (blueprint == null) return;

		const wrapper = new BlueprintWrapper(blueprint);
		setEditedLabel(wrapper.getLabel() ?? '');
		setEditedDescription(wrapper.getDescription() ?? '');
		setIsEditing(true);
		setHasPendingChanges(false);
	}, [blueprint]);

	const cancelEditing = useCallback(() => {
		setIsEditing(false);
		setHasPendingChanges(false);
	}, []);

	const saveChanges = useCallback(async () => {
		if (blueprint == null) return;

		setIsSaving(true);
		try {
			const blueprintToSave = getUpdatedBlueprint(
				blueprint,
				editedLabel,
				editedDescription,
				selectedPath,
				rootBlueprint,
			);
			if (blueprintToSave == null) return;

			const serializedBlueprint = serializeBlueprint(blueprintToSave);
			await addBlueprint(serializedBlueprint, getBlueprintGameData(blueprintToSave), selectedPath, 'edit');
			void navigate({
				search: (previous) => ({
					...previous,
					pasted: serializedBlueprint,
					selection: selectedPath,
					fetchType: 'edit' as const,
				}),
			});

			setHasPendingChanges(false);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}, [blueprint, rootBlueprint, selectedPath, navigate, editedLabel, editedDescription]);

	if (blueprint == null) return null;

	return (
		<>
			<BasicInfoPanel
				blueprint={blueprint}
				onLabelEdit={handleLabelEdit}
				onDescriptionEdit={handleDescriptionEdit}
				onCancelEdit={cancelEditing}
				editable={isEditing}
			/>

			<div className="edit-controls">
				{isEditing ? (
					<div className="editable-actions">
						<ButtonGreen
							onClick={() => {
								void saveChanges();
							}}
							disabled={!hasPendingChanges || isSaving}
						>
							<Save size={16} />
							{isSaving ? 'Saving...' : 'Save Changes'}
						</ButtonGreen>
						<Button onClick={cancelEditing} disabled={isSaving}>
							<X size={16} />
							Cancel
						</Button>
					</div>
				) : (
					<Button onClick={startEditing}>
						<Pencil size={16} />
						Edit Label & Description
					</Button>
				)}
			</div>

			{blueprint.blueprint ? <ContentsPanel blueprint={blueprint} /> : null}
			{blueprint.blueprint || blueprint.blueprint_book ? (
				<LintPanel blueprint={blueprint} selectedPath={selectedPath} onSelect={onSelect} />
			) : null}
			{blueprint.upgrade_planner ? <UpgradePlannerPanel blueprint={blueprint} /> : null}
			{blueprint.deconstruction_planner ? <DeconstructionPlannerPanel blueprint={blueprint} /> : null}
			<ModDetectionPanel blueprint={blueprint} />
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
