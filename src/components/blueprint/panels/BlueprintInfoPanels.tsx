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

		// Initialize edit fields with current values
		let label = '';
		let description = '';

		if (blueprint.blueprint) {
			// Use optional chaining and explicit casting
			label = (blueprint.blueprint?.label as string) || '';
			description = (blueprint.blueprint?.description as string) || '';
		} else if (blueprint.blueprint_book) {
			// Use optional chaining and explicit casting
			label = (blueprint.blueprint_book?.label as string) || '';
			description = (blueprint.blueprint_book?.description as string) || '';
		} else if (blueprint.upgrade_planner) {
			// Use optional chaining and explicit casting
			label = (blueprint.upgrade_planner?.label as string) || '';
			description = (blueprint.upgrade_planner?.description as string) || '';
		} else if (blueprint.deconstruction_planner) {
			// Use optional chaining and explicit casting
			label = (blueprint.deconstruction_planner?.label as string) || '';
			description = (blueprint.deconstruction_planner?.description as string) || '';
		}

		// Type assertion to ensure TypeScript knows these are strings
		setEditedLabel(String(label));
		setEditedDescription(String(description));
		setIsEditing(true);
		setHasPendingChanges(false);
	}, [blueprint]);

	const cancelEditing = useCallback(() => {
		setIsEditing(false);
		setHasPendingChanges(false);
	}, []);

	const saveChanges = useCallback(async () => {
		if (!blueprint || !pasted) return;

		setIsSaving(true);

		try {
			let blueprintToSave: BlueprintString;

			// Check if we're editing a nested blueprint
			if (selectedPath && rootBlueprint) {
				// Use the immutable update function to update the nested blueprint
				const updater = createLabelDescriptionUpdater(editedLabel, editedDescription);
				const updatedRoot = updateNestedBlueprint(rootBlueprint, selectedPath, updater);

				if (!updatedRoot) {
					console.error('Failed to update nested blueprint');
					setIsSaving(false);
					return;
				}

				blueprintToSave = updatedRoot;
			} else {
				// We're editing the root blueprint or don't have a path
				const wrapper = new BlueprintWrapper(blueprint);

				// Update both label and description
				let updated = false;
				updated = wrapper.updateLabel(editedLabel) || updated;
				updated = wrapper.updateDescription(editedDescription) || updated;

				if (!updated) {
					setIsSaving(false);
					return;
				}

				blueprintToSave = wrapper.getRawBlueprint();
			}

			// Serialize the blueprint to base64 for storage
			const serializedBlueprint = serializeBlueprint(blueprintToSave);

			// Add the updated blueprint to the database with 'edit' fetch type
			// When editing a nested blueprint, we save the entire root structure
			const result = await addBlueprint(serializedBlueprint, blueprintToSave, selectedPath, 'edit');

			// Update the URL to use the new blueprint
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

	// If no blueprint is provided, render nothing
	if (!blueprint) return null;

	// Render panel content
	return (
		<>
			{/* Basic Info Panel with optional editing */}
			<BasicInfoPanel
				blueprint={blueprint}
				onLabelEdit={handleLabelEdit}
				onDescriptionEdit={handleDescriptionEdit}
				editable={isEditing}
			/>

			{/* Edit controls */}
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

			{/* Show type-specific panels */}
			{blueprint.blueprint && <ContentsPanel blueprint={blueprint} />}
			{blueprint.upgrade_planner && <UpgradePlannerPanel blueprint={blueprint} />}
			{blueprint.deconstruction_planner && <DeconstructionPlannerPanel blueprint={blueprint} />}
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
