import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import type {BlueprintString} from '../../src/parsing/types';

import {type DiscardConfirmationLayout, inspectDiscardConfirmationViewport} from './setup';

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

async function renderDiscardConfirmationHtml(): Promise<string> {
	const user = userEvent.setup();
	render(<TransformPanel blueprint={blueprint} />);

	await user.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
	await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
	const plannerName = screen.getByRole('textbox', {name: 'Name'});
	await user.clear(plannerName);
	await user.type(plannerName, 'Dirty planner');
	await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
	await user.click(screen.getByRole('button', {name: 'Close Upgrade Planner'}));
	screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});

	return document.body.innerHTML;
}

test('keeps the discard confirmation centered on the viewport with separated actions', async () => {
	const html = await renderDiscardConfirmationHtml();
	const viewports = [
		{height: 1560, width: 1024},
		{height: 640, width: 320},
	];
	const layouts: Array<DiscardConfirmationLayout | undefined> = [];
	for (const viewport of viewports) {
		layouts.push(await inspectDiscardConfirmationViewport('discard-confirmation-viewport', html, viewport));
	}
	const availableLayouts = layouts.filter((layout): layout is DiscardConfirmationLayout => layout !== undefined);
	const expectedLayout: DiscardConfirmationLayout = {
		actionsFitHorizontally: true,
		backdropCoversViewport: true,
		buttonLabelsFit: true,
		buttonsDoNotOverlap: true,
		confirmationCentered: true,
		confirmationFitsViewport: true,
	};

	expect(availableLayouts).toStrictEqual(availableLayouts.map(() => expectedLayout));
});
