import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {
	UpgradePlannerSelectorDialog,
	type UpgradePlannerChoice,
} from '../../src/components/blueprint/panels/transform/UpgradePlannerSelectorDialog';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../src/parsing/types';
import type {DatabaseBlueprint} from '../../src/storage/db';
import {parseUpgradePlanner, type UpgradeDirection} from '../../src/transform/upgradePlanner';
import upgradePlannerFixture from '../fixtures/blueprints/json/upgrade.json';

const mocks = vi.hoisted(() => ({
	historyBlueprints: [] as DatabaseBlueprint[],
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => mocks.historyBlueprints,
}));

const fixturePlanner: UpgradePlanner = {
	...parseUpgradePlanner(JSON.stringify(upgradePlannerFixture)),
	label: "Alice's fixture belt upgrades",
};
const zeroMatchPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: 'Zero-match module planner',
	version: 0,
	settings: {
		mappers: [
			{
				index: 100,
				from: {type: 'item', name: 'speed-module'},
				to: {type: 'item', name: 'speed-module-2'},
			},
		],
	},
};
const rootBlueprint: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		blueprints: [{index: 100, upgrade_planner: fixturePlanner}],
	},
};

function storedPlanner(sha: string, planner: UpgradePlanner, label: string, lastUpdatedOn: number): DatabaseBlueprint {
	return {
		metadata: {
			sha,
			createdOn: 0,
			lastUpdatedOn,
			data: serializeBlueprint({upgrade_planner: planner}),
			fetchMethod: 'data',
		},
		gameData: {type: 'upgrade_planner', label, icons: []},
	};
}

describe('UpgradePlannerSelectorDialog', () => {
	beforeEach(() => {
		mocks.historyBlueprints = [
			storedPlanner('sha-100', fixturePlanner, 'Duplicate fixture planner', 1000),
			storedPlanner('sha-200', zeroMatchPlanner, 'Zero-match history planner', 0),
		];
	});

	test('shows fixture, history, and default planners once in an inventory grid', () => {
		render(
			<UpgradePlannerSelectorDialog
				dialogId="upgrade-planner-selector"
				includeEditingChoices={false}
				rootBlueprint={rootBlueprint}
				selectedSource="suggested"
				onChoose={vi.fn<(choice: UpgradePlannerChoice, direction: UpgradeDirection) => void>()}
				onClose={vi.fn<() => void>()}
			/>,
		);

		const tiles = within(screen.getByRole('grid', {name: 'Upgrade planners'})).getAllByRole('button');
		expect(
			tiles.map((tile) => ({
				icon: tile.querySelector('img')?.getAttribute('src'),
				label: tile.getAttribute('aria-label'),
				pressed: tile.getAttribute('aria-pressed'),
				tabIndex: tile.tabIndex,
				title: tile.title,
			})),
		).toStrictEqual([
			{
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: 'Default Upgrade',
				pressed: 'true',
				tabIndex: 0,
				title: 'Default Upgrade',
			},
			{
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: "Alice's fixture belt upgrades",
				pressed: 'false',
				tabIndex: -1,
				title: "Alice's fixture belt upgrades",
			},
			{
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: 'Zero-match module planner',
				pressed: 'false',
				tabIndex: -1,
				title: 'Zero-match module planner',
			},
		]);
	});

	test('supports arrow-key upgrade selection and context-click downgrade selection', async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn<(choice: UpgradePlannerChoice, direction: UpgradeDirection) => void>();
		render(
			<UpgradePlannerSelectorDialog
				dialogId="upgrade-planner-selector"
				includeEditingChoices={false}
				rootBlueprint={rootBlueprint}
				selectedSource="suggested"
				onChoose={onChoose}
				onClose={vi.fn<() => void>()}
			/>,
		);

		await user.keyboard('{ArrowRight}{Enter}');
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Zero-match module planner'}));

		expect(onChoose.mock.calls).toStrictEqual([
			[
				{
					label: "Alice's fixture belt upgrades",
					planner: fixturePlanner,
					source: 'book:1',
				},
				'upgrade',
			],
			[
				{
					label: 'Zero-match module planner',
					planner: zeroMatchPlanner,
					source: 'history:sha-200',
				},
				'downgrade',
			],
		]);
	});
});
