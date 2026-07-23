import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {
	IconReplacementDialog,
	type IconReplacementDialogProps,
} from '../../src/components/blueprint/panels/transform/IconReplacementDialog';
import type {BlueprintString, SignalID} from '../../src/parsing/types';
import type {IconReplacement} from '../../src/transform/metadataSubstitution';

const redSignal: SignalID = {type: 'virtual', name: 'signal-red'};
const blueSignal: SignalID = {type: 'virtual', name: 'signal-blue'};
const greenSignal: SignalID = {type: 'virtual', name: 'signal-green'};

const rootBlueprint: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		icons: [{index: 1, signal: redSignal}],
		blueprints: [
			{
				index: 100,
				blueprint_book: {
					item: 'blueprint-book',
					version: 0,
					icons: [{index: 1, signal: greenSignal}],
					blueprints: [],
				},
			},
		],
	},
};

const replacements: IconReplacement[] = [{from: redSignal, to: blueSignal}];

async function chooseSignal(user: ReturnType<typeof userEvent.setup>, label: string) {
	await user.click(screen.getByRole('button', {name: `Choose ${label}`}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));
}

test('uses root icons as sources and preserves mappings while incomplete choices are dismissed', async () => {
	const user = userEvent.setup();
	const onChange = vi.fn<IconReplacementDialogProps['onChange']>();
	render(
		<IconReplacementDialog
			onChange={onChange}
			onClose={vi.fn<IconReplacementDialogProps['onClose']>()}
			replacements={replacements}
			rootBlueprint={rootBlueprint}
		/>,
	);

	const mapping = screen.getByRole('button', {name: 'Remove replacement for Signal red'}).parentElement;
	if (mapping === null) {
		throw new Error('The committed icon mapping row was not rendered.');
	}
	expect({
		count: mapping.querySelector('strong')?.textContent,
		endpointClasses: ['Source Signal red', 'Target Signal blue'].map(
			(name) => screen.getByRole('button', {name}).parentElement?.className,
		),
		names: [...mapping.querySelectorAll('.icon-replacement-editor__name')].map((element) => element.textContent),
		titles: ['Source Signal red', 'Target Signal blue'].map((name) =>
			screen.getByRole('button', {name}).getAttribute('title'),
		),
	}).toStrictEqual({
		count: '1',
		endpointClasses: ['icon-replacement-editor__endpoint', 'icon-replacement-editor__endpoint'],
		names: ['Signal red', 'Signal blue'],
		titles: ['Signal red\nvirtual:signal-red', 'Signal blue\nvirtual:signal-blue'],
	});

	await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
	expect(
		within(screen.getByRole('dialog', {name: 'Choose source icon used here'}))
			.getAllByRole('button')
			.map((button) => button.getAttribute('aria-label'))
			.filter((label): label is string => label?.startsWith('Choose ') === true),
	).toStrictEqual(['Choose Signal green']);

	fireEvent.keyDown(window, {key: 'q', code: 'KeyQ'});
	expect({
		committedMapping: screen
			.getByRole('button', {name: 'Remove replacement for Signal red'})
			.getAttribute('aria-label'),
		picker: screen.queryByRole('dialog', {name: 'Choose source icon used here'}),
	}).toStrictEqual({
		committedMapping: 'Remove replacement for Signal red',
		picker: null,
	});

	await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
	await chooseSignal(user, 'Signal green');
	await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
	expect({
		blue: screen.getByRole('button', {name: 'Choose Signal blue'}).getAttribute('title'),
		yellow: screen.getByRole('button', {name: 'Choose Signal yellow'}).getAttribute('title'),
	}).toStrictEqual({
		blue: 'Signal blue\nvirtual:signal-blue',
		yellow: 'Signal yellow\nvirtual:signal-yellow',
	});

	fireEvent.keyDown(window, {key: 'Escape', code: 'Escape'});
	expect({
		clearSource: screen.getByRole('button', {name: 'Clear source Signal green'}).getAttribute('aria-label'),
		committedMapping: screen
			.getByRole('button', {name: 'Remove replacement for Signal red'})
			.getAttribute('aria-label'),
		picker: screen.queryByRole('dialog', {name: 'Choose target icon'}),
	}).toStrictEqual({
		clearSource: 'Clear source Signal green',
		committedMapping: 'Remove replacement for Signal red',
		picker: null,
	});

	await user.click(screen.getByRole('button', {name: 'Clear source Signal green'}));
	expect({
		clearSource: screen.queryByRole('button', {name: /Clear source/}),
		targetDisabled: screen.getByRole('button', {name: 'Choose target icon'}).getAttribute('aria-disabled'),
	}).toStrictEqual({
		clearSource: null,
		targetDisabled: 'true',
	});

	await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
	await chooseSignal(user, 'Signal green');
	await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
	await chooseSignal(user, 'Signal yellow');

	expect(onChange).toHaveBeenCalledExactlyOnceWith([
		{from: redSignal, to: blueSignal},
		{from: greenSignal, to: {type: 'virtual', name: 'signal-yellow'}},
	]);
});
