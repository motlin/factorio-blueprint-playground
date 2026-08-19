import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {
	TextReplacementEditor,
	type TextReplacementEditorProps,
} from '../../src/components/blueprint/panels/transform/TextReplacementEditor';

function editorProps(): TextReplacementEditorProps {
	return {
		affectedCount: 3,
		enabled: true,
		find: 'red',
		onEnabledChange: vi.fn<(enabled: boolean) => void>(),
		onFindChange: vi.fn<(value: string) => void>(),
		onReplacementChange: vi.fn<(value: string) => void>(),
		replacement: 'blue',
	};
}

test('renders a compact affected-count row and reports each edit', () => {
	const props = editorProps();
	render(<TextReplacementEditor {...props} />);

	fireEvent.click(screen.getByRole('checkbox', {name: 'Enable text replacement'}));
	fireEvent.change(screen.getByRole('textbox', {name: 'Find'}), {target: {value: 'Red'}});
	fireEvent.change(screen.getByRole('textbox', {name: 'Replace'}), {target: {value: 'Blue'}});

	expect({
		affected: screen.getByText('3 affected').textContent,
		enabledCalls: vi.mocked(props.onEnabledChange).mock.calls,
		findCalls: vi.mocked(props.onFindChange).mock.calls,
		groupClass: screen.getByRole('group', {name: 'Text replacement'}).className,
		preserveCase: screen.queryByRole('checkbox', {name: /Preserve case/i}),
		replacementCalls: vi.mocked(props.onReplacementChange).mock.calls,
	}).toStrictEqual({
		affected: '3 affected',
		enabledCalls: [[false]],
		findCalls: [['Red']],
		groupClass: 'text-replacement-editor',
		preserveCase: null,
		replacementCalls: [['Blue']],
	});
});

test('shows the enable control only for a populated replacement', () => {
	const props = editorProps();
	const {rerender} = render(<TextReplacementEditor {...props} find="" affectedCount={0} />);

	expect({
		affected: screen.getByText('0 affected').textContent,
		enableControl: screen.queryByRole('checkbox', {name: 'Enable text replacement'}),
		find: screen.getByRole<HTMLInputElement>('textbox', {name: 'Find'}).value,
		replace: screen.getByRole<HTMLInputElement>('textbox', {name: 'Replace'}).value,
	}).toStrictEqual({
		affected: '0 affected',
		enableControl: null,
		find: '',
		replace: 'blue',
	});

	rerender(<TextReplacementEditor {...props} />);
	expect(screen.getByRole<HTMLInputElement>('checkbox', {name: 'Enable text replacement'}).checked).toBe(true);
});
