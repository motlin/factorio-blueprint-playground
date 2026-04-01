import {useNavigate} from '@tanstack/react-router';
import {Pencil, Save, X} from 'lucide-react';
import {memo, useCallback, useState} from 'react';

import {BlueprintWrapper} from '../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../parsing/blueprintParser';
import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../../parsing/nestedBlueprintEditor';
import type {BlueprintString} from '../../../parsing/types';
import {type RootSearch, Route} from '../../../routes';
import {addBlueprint} from '../../../state/blueprintLocalStorage';
import {Button} from '../../ui/Button';
import {ButtonGreen} from '../../ui/ButtonGreen';

import {ContentsPanel} from './contents/ContentsPanel';
import {DeconstructionPlannerPanel} from './deconstruction/DeconstructionPlannerPanel';
import {BasicInfoPanel} from './info/BasicInfoPanel';
import {UpgradePlannerPanel} from './upgrade/UpgradePlannerPanel';

const getUpdatedBlueprint = (
	blueprint: BlueprintString,
	label: string,
	description: string,
	selectedPath?: string,
	rootBlueprint?: BlueprintString,
): BlueprintString | null => {
	if (selectedPath && rootBlueprint) {
		const updater = createLabelDescriptionUpdater(label, description);
		const updated = updateNestedBlueprint(rootBlueprint, selectedPath, updater);
		if (!updated) {
			console.error('Failed to update nested blueprint');
		}
		return updated;
	}
	const wrapper = new BlueprintWrapper(blueprint);
	let updated = false;
	updated = wrapper.updateLabel(label) || updated;
	updated = wrapper.updateDescription(description) || updated;
	return updated ? wrapper.getRawBlueprint() : null;
};

interface BlueprintInfoPanelsProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

const BlueprintInfoPanelsComponent = ({blueprint, rootBlueprint, selectedPath}: BlueprintInfoPanelsProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedLabel, setEditedLabel] = useState('');
	const [editedDescription, setEditedDescription] = useState('');
	const [hasPendingChanges, setHasPendingChanges] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const navigate = useNavigate({from: Route.fullPath});
	const {pasted}: RootSearch = Route.useSearch();

	const handleLabelEdit = useCallback((newLabel: string) => {
		setEditedLabel(newLabel);
		setHasPendingChanges(true);
	}, []);

	const handleDescriptionEdit = useCallback((newDescription: string) => {
		setEditedDescription(newDescription);
		setHasPendingChanges(true);
	}, []);

	const startEditing = useCallback(() => {
		if (!blueprint) return;

		const wrapper = new BlueprintWrapper(blueprint);
		setEditedLabel(wrapper.getLabel() || '');
		setEditedDescription(wrapper.getDescription() || '');
		setIsEditing(true);
		setHasPendingChanges(false);
	}, [blueprint]);

	const cancelEditing = useCallback(() => {
		setIsEditing(false);
		setHasPendingChanges(false);
	}, []);

	const saveChanges = useCallback(async () => {
		if (!(blueprint && pasted)) return;

		setIsSaving(true);

		try {
			const blueprintToSave = getUpdatedBlueprint(
				blueprint,
				editedLabel,
				editedDescription,
				selectedPath,
				rootBlueprint,
			);
			if (!blueprintToSave) return;

			const serializedBlueprint = serializeBlueprint(blueprintToSave);
			const result = await addBlueprint(serializedBlueprint, blueprintToSave, selectedPath, 'edit');

			if (result) {
				void navigate({
					search: (prev: RootSearch): RootSearch => ({
						...prev,
						pasted: serializedBlueprint,
						selection: selectedPath,
						fetchType: 'edit' as const,
					}),
				});
			}

			setHasPendingChanges(false);
			setIsEditing(false);
		} catch (error) {
			console.error('Error saving blueprint changes:', error);
		} finally {
			setIsSaving(false);
		}
	}, [blueprint, rootBlueprint, pasted, selectedPath, navigate, editedLabel, editedDescription]);

	if (!blueprint) return null;

	return (
		<>
			<BasicInfoPanel
				blueprint={blueprint}
				onLabelEdit={handleLabelEdit}
				onDescriptionEdit={handleDescriptionEdit}
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
						<Button
							onClick={cancelEditing}
							disabled={isSaving}
						>
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
			{blueprint.upgrade_planner ? <UpgradePlannerPanel blueprint={blueprint} /> : null}
			{blueprint.deconstruction_planner ? <DeconstructionPlannerPanel blueprint={blueprint} /> : null}
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
