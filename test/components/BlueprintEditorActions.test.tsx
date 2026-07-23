import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, expect, test, vi} from 'vite-plus/test';

import {BlueprintEditorActions} from '../../src/components/blueprint/panels/transform/BlueprintEditorActions';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';

const {navigate} = vi.hoisted(() => ({
	navigate: vi.fn<(options: unknown) => void>(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => navigate,
}));

beforeEach(() => {
	navigate.mockReset();
});

test('saves an edited root blueprint for export and preserves the root selection', async () => {
	const user = userEvent.setup();
	const onClose = vi.fn<() => void>();
	const onSaved = vi.fn<(savedRoot: BlueprintString) => void>();
	const rootBlueprint: BlueprintString = {
		blueprint: {item: 'blueprint', label: 'Alice', version: 0},
	};
	const draftBlueprint: BlueprintString = {
		blueprint: {item: 'blueprint', label: 'Bob', version: 0},
	};
	const {rerender} = render(
		<BlueprintEditorActions
			dirty={false}
			draftBlueprint={rootBlueprint}
			onClose={onClose}
			onSaved={onSaved}
			rootBlueprint={rootBlueprint}
			selectedPath=""
		/>,
	);

	const unchangedSave = screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'});
	expect({
		disabled: unchangedSave.disabled,
		navigation: navigate.mock.calls,
		scope: screen.getByText(
			'Saves changes to the loaded blueprint. Export and Open in Playground use the saved blueprint.',
		).textContent,
	}).toStrictEqual({
		disabled: true,
		navigation: [],
		scope: 'Saves changes to the loaded blueprint. Export and Open in Playground use the saved blueprint.',
	});
	rerender(
		<BlueprintEditorActions
			dirty
			onClose={onClose}
			onSaved={onSaved}
			rootBlueprint={rootBlueprint}
			selectedPath=""
		/>,
	);
	expect({
		disabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
		navigation: navigate.mock.calls,
	}).toStrictEqual({disabled: true, navigation: []});

	rerender(
		<BlueprintEditorActions
			dirty
			draftBlueprint={draftBlueprint}
			onClose={onClose}
			onSaved={onSaved}
			rootBlueprint={rootBlueprint}
			selectedPath=""
		/>,
	);
	await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

	expect({
		navigation: navigate.mock.calls,
		onClose: onClose.mock.calls,
		onSaved: onSaved.mock.calls,
	}).toStrictEqual({
		navigation: [
			[
				{
					to: '/',
					search: {pasted: serializeBlueprint(draftBlueprint), selection: ''},
				},
			],
		],
		onClose: [],
		onSaved: [[draftBlueprint]],
	});
});

test('writes an edited child into the entire book and preserves the nested selection', async () => {
	const user = userEvent.setup();
	const onSaved = vi.fn<(savedRoot: BlueprintString) => void>();
	const rootBlueprint: BlueprintString = {
		blueprint_book: {
			item: 'blueprint-book',
			label: "Alice's test book",
			version: 0,
			blueprints: [
				{index: 100, blueprint: {item: 'blueprint', label: 'Bob', version: 0}},
				{index: 200, blueprint: {item: 'blueprint', label: 'Charlie', version: 0}},
			],
		},
	};
	const draftBlueprint: BlueprintString = {
		blueprint: {item: 'blueprint', label: 'Updated Bob', version: 0},
	};
	const savedRoot: BlueprintString = {
		blueprint_book: {
			item: 'blueprint-book',
			label: "Alice's test book",
			version: 0,
			blueprints: [
				{blueprint: {item: 'blueprint', label: 'Updated Bob', version: 0}, index: 100},
				{index: 200, blueprint: {item: 'blueprint', label: 'Charlie', version: 0}},
			],
		},
	};
	render(
		<BlueprintEditorActions
			dirty
			draftBlueprint={draftBlueprint}
			onClose={vi.fn<() => void>()}
			onSaved={onSaved}
			rootBlueprint={rootBlueprint}
			selectedPath="1"
		/>,
	);

	expect({
		disabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save to book'}).disabled,
		scope: screen.getByText(
			'Saves this entry into the loaded book. Export and Open in Playground use the entire saved book.',
		).textContent,
	}).toStrictEqual({
		disabled: false,
		scope: 'Saves this entry into the loaded book. Export and Open in Playground use the entire saved book.',
	});

	await user.click(screen.getByRole('button', {name: 'Save to book'}));

	expect({navigation: navigate.mock.calls, onSaved: onSaved.mock.calls}).toStrictEqual({
		navigation: [
			[
				{
					to: '/',
					search: {pasted: serializeBlueprint(savedRoot), selection: '1'},
				},
			],
		],
		onSaved: [[savedRoot]],
	});
});
