import {fireEvent, render, screen} from '@testing-library/react';
import {readFileSync} from 'fs';
import {join} from 'path';
import {describe, expect, test, vi} from 'vitest';

import {BasicInfoPanel} from '../../src/components/blueprint/panels/info/BasicInfoPanel';
import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import '../setup';

// Load the simple.txt blueprint string
const simpleBlueprintString = readFileSync(join(__dirname, '../fixtures/blueprints/txt/simple.txt'), 'utf-8').trim();

// Parse it to get the BlueprintString object
const blueprintObject = deserializeBlueprint(simpleBlueprintString);

describe('BasicInfoPanel editing functionality', () => {
	test('renders in read-only mode by default', () => {
		render(<BasicInfoPanel blueprint={blueprintObject} />);

		// The panel title should be visible
		expect(screen.getByText('Basic Information')).toBeInTheDocument();

		// When in read-only mode, no edit icons should be visible
		const editIcons = screen.queryAllByText('✎');
		expect(editIcons.length).toBe(0);
	});

	test('renders in editable mode when editable prop is true', () => {
		const onLabelEdit = vi.fn();
		const onDescriptionEdit = vi.fn();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		// The panel title should be visible
		expect(screen.getByText('Basic Information')).toBeInTheDocument();

		// When in editable mode, the EditableLabelDescription component should be visible
		// Check for the presence of label and description input fields
		expect(screen.getByLabelText('Label:')).toBeInTheDocument();
		expect(screen.getByLabelText('Description:')).toBeInTheDocument();

		// Check for the help text indicating keyboard shortcuts
		expect(screen.getByText('Press Ctrl+Enter to save. Esc to cancel.')).toBeInTheDocument();
	});

	test('calls onLabelEdit when label is changed', () => {
		const onLabelEdit = vi.fn();
		const onDescriptionEdit = vi.fn();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		// When editable is true, the component is already in edit mode
		// Find the label input field directly
		const labelInput = screen.getByLabelText('Label:');

		// Get the current value of the description field (to preserve it)
		const descriptionTextarea = screen.getByPlaceholderText('Enter blueprint description...');
		const currentDescription = descriptionTextarea.value || '';

		// Change the input value
		fireEvent.change(labelInput, {
			target: {value: 'New Label Text'},
		});

		// Trigger save with Ctrl+Enter
		fireEvent.keyDown(labelInput, {
			key: 'Enter',
			code: 'Enter',
			ctrlKey: true,
		});

		// Both callbacks are called when save is triggered
		expect(onLabelEdit).toHaveBeenCalledWith('New Label Text');
		expect(onDescriptionEdit).toHaveBeenCalledWith(currentDescription);
	});

	test('calls onDescriptionEdit when description is changed', () => {
		const onLabelEdit = vi.fn();
		const onDescriptionEdit = vi.fn();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		// In editable mode, there should be a textarea for the description
		const descriptionTextarea = screen.getByLabelText('Description:');
		if (!descriptionTextarea) throw new Error('Description textarea not found');

		// Change the textarea value
		fireEvent.change(descriptionTextarea, {
			target: {value: 'New Description Text'},
		});

		// Trigger save with Ctrl+Enter
		fireEvent.keyDown(descriptionTextarea, {
			key: 'Enter',
			code: 'Enter',
			ctrlKey: true,
		});

		// onLabelEdit and onDescriptionEdit should have been called
		// The EditableLabelDescription component calls onSave with both values
		expect(onDescriptionEdit).toHaveBeenCalledWith('New Description Text');
		expect(onLabelEdit).toHaveBeenCalled();
	});
});
