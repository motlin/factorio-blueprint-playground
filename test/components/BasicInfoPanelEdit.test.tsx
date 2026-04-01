import {fireEvent, render, screen} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test, vi} from 'vite-plus/test';

import {BasicInfoPanel} from '../../src/components/blueprint/panels/info/BasicInfoPanel';
import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import '../setup';

const simpleBlueprintString = readFileSync(join(__dirname, '../fixtures/blueprints/txt/simple.txt'), 'utf-8').trim();

const blueprintObject = deserializeBlueprint(simpleBlueprintString);

describe('BasicInfoPanel editing functionality', () => {
	test('renders in read-only mode by default', () => {
		render(<BasicInfoPanel blueprint={blueprintObject} />);

		expect(screen.getByText('Basic Information')).toBeInTheDocument();

		const editIcons = screen.queryAllByText('✎');
		expect(editIcons.length).toBe(0);
	});

	test('renders in editable mode when editable prop is true', () => {
		const onLabelEdit = vi.fn<(label: string) => void>();
		const onDescriptionEdit = vi.fn<(description: string) => void>();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		expect(screen.getByText('Basic Information')).toBeInTheDocument();

		expect(screen.getByLabelText('Label:')).toBeInTheDocument();
		expect(screen.getByLabelText('Description:')).toBeInTheDocument();

		expect(screen.getByText('Press Ctrl+Enter to save. Esc to cancel.')).toBeInTheDocument();
	});

	test('calls onLabelEdit when label is changed', () => {
		const onLabelEdit = vi.fn<(label: string) => void>();
		const onDescriptionEdit = vi.fn<(description: string) => void>();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		const labelInput = screen.getByLabelText('Label:');

		const descriptionTextarea = screen.getByPlaceholderText<HTMLTextAreaElement>('Enter blueprint description...');
		const currentDescription = descriptionTextarea.value;

		fireEvent.change(labelInput, {
			target: {value: 'New Label Text'},
		});

		fireEvent.keyDown(labelInput, {
			key: 'Enter',
			code: 'Enter',
			ctrlKey: true,
		});

		expect(onLabelEdit).toHaveBeenCalledWith('New Label Text');
		expect(onDescriptionEdit).toHaveBeenCalledWith(currentDescription);
	});

	test('calls onDescriptionEdit when description is changed', () => {
		const onLabelEdit = vi.fn<(label: string) => void>();
		const onDescriptionEdit = vi.fn<(description: string) => void>();

		render(
			<BasicInfoPanel
				blueprint={blueprintObject}
				editable={true}
				onLabelEdit={onLabelEdit}
				onDescriptionEdit={onDescriptionEdit}
			/>,
		);

		const descriptionTextarea = screen.getByLabelText<HTMLTextAreaElement>('Description:');

		fireEvent.change(descriptionTextarea, {
			target: {value: 'New Description Text'},
		});

		fireEvent.keyDown(descriptionTextarea, {
			key: 'Enter',
			code: 'Enter',
			ctrlKey: true,
		});

		expect(onDescriptionEdit).toHaveBeenCalledWith('New Description Text');
		expect(onLabelEdit).toHaveBeenCalled();
	});
});
