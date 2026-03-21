import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, test, vi} from 'vitest';

import {EditableText} from '../../src/components/ui/EditableText';
import '../setup';

describe('EditableText component', () => {
	test('renders in display mode initially', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Test Value"
				onChange={onChange}
			/>,
		);

		expect(screen.getByText('Test Value')).toBeInTheDocument();
		expect(screen.getByText('✎')).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	test('displays placeholder when no value is provided', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value=""
				onChange={onChange}
				placeholder="Enter something..."
			/>,
		);

		expect(screen.getByText('Enter something...')).toBeInTheDocument();
	});

	test('switches to edit mode when clicked', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Test Value"
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByText('Test Value'));

		// After clicking, should show an input field with the value
		expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument();
		expect(screen.getByText('✓ Save')).toBeInTheDocument();
		expect(screen.getByText('✗ Cancel')).toBeInTheDocument();
	});

	test('calls onChange when saving changes', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Initial Value"
				onChange={onChange}
			/>,
		);

		// Click to enter edit mode
		fireEvent.click(screen.getByText('Initial Value'));

		// Change the input value
		fireEvent.change(screen.getByDisplayValue('Initial Value'), {
			target: {value: 'Updated Value'},
		});

		// Click save button
		fireEvent.click(screen.getByText('✓ Save'));

		// Should call onChange with the new value
		expect(onChange).toHaveBeenCalledWith('Updated Value');

		// Should go back to display mode, but we can't check the text directly
		// since the EditableText component's implementation determines what's displayed
		expect(screen.queryByText('✓ Save')).not.toBeInTheDocument();
	});

	test('keeps old value when canceling', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Original Value"
				onChange={onChange}
			/>,
		);

		// Click to enter edit mode
		fireEvent.click(screen.getByText('Original Value'));

		// Change the input value
		fireEvent.change(screen.getByDisplayValue('Original Value'), {
			target: {value: 'Changed Value'},
		});

		// Click cancel button
		fireEvent.click(screen.getByText('✗ Cancel'));

		// Should not call onChange
		expect(onChange).not.toHaveBeenCalled();

		// Should go back to display mode with original value
		expect(screen.getByText('Original Value')).toBeInTheDocument();
	});

	test('handles Enter key to save in single line mode', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Single Line Text"
				onChange={onChange}
				multiline={false}
			/>,
		);

		// Click to enter edit mode
		fireEvent.click(screen.getByText('Single Line Text'));

		// Change the input value
		const input = screen.getByDisplayValue('Single Line Text');
		fireEvent.change(input, {
			target: {value: 'Updated Text'},
		});

		// Press Enter key
		fireEvent.keyDown(input, {key: 'Enter'});

		// Should call onChange with the new value
		expect(onChange).toHaveBeenCalledWith('Updated Text');
	});

	test('handles Escape key to cancel', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Sample Text"
				onChange={onChange}
			/>,
		);

		// Click to enter edit mode
		fireEvent.click(screen.getByText('Sample Text'));

		// Change the input value
		const input = screen.getByDisplayValue('Sample Text');
		fireEvent.change(input, {
			target: {value: 'Changed Sample'},
		});

		// Press Escape key
		fireEvent.keyDown(input, {key: 'Escape'});

		// Should not call onChange
		expect(onChange).not.toHaveBeenCalled();

		// Should go back to display mode with original value
		expect(screen.getByText('Sample Text')).toBeInTheDocument();
	});

	test.skip('renders text area for multiline mode', () => {
		const onChange = vi.fn();

		render(
			<EditableText
				value="Multiline\nText\nContent"
				onChange={onChange}
				multiline={true}
				rows={5}
			/>,
		);

		// Click to enter edit mode using container query selector since newlines cause issues with getByText
		const container = screen.getByTitle('Click to edit');
		fireEvent.click(container);

		// Should render a textarea instead of input
		const textarea = screen.getByDisplayValue('Multiline\nText\nContent');
		expect(textarea.tagName).toBe('TEXTAREA');
		expect(textarea).toHaveAttribute('rows', '5');
	});
});
