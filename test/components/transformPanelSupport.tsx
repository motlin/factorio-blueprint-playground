import {fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../src/parsing/types';
import {db, LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';
import {readFixtureFile} from '../fixtures/utils';

export const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};
export const rareBeltUpgradesPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: 'Rare belt upgrades',
	version: 0,
	settings: {
		description: 'Rare belt line',
		icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
		mappers: [
			{
				index: 0,
				from: {type: 'entity', name: 'assembling-machine-1'},
				to: {type: 'entity', name: 'assembling-machine-2'},
			},
			{
				index: 1,
				from: {type: 'entity', name: 'assembling-machine-2'},
				to: {type: 'entity', name: 'assembling-machine-3'},
			},
			{
				index: 2,
				from: {type: 'entity', name: 'inserter'},
				to: {type: 'entity', name: 'fast-inserter'},
			},
			{
				index: 3,
				from: {type: 'entity', name: 'fast-inserter'},
				to: {type: 'entity', name: 'bulk-inserter'},
			},
			{
				index: 4,
				from: {type: 'entity', name: 'splitter'},
				to: {type: 'entity', name: 'fast-splitter'},
			},
			{
				index: 5,
				from: {type: 'entity', name: 'fast-splitter'},
				to: {type: 'entity', name: 'express-splitter'},
			},
			{
				index: 6,
				from: {type: 'entity', name: 'express-splitter'},
				to: {type: 'entity', name: 'turbo-splitter'},
			},
			{
				index: 7,
				from: {type: 'entity', name: 'stone-furnace'},
				to: {type: 'entity', name: 'steel-furnace'},
			},
			{
				index: 8,
				from: {type: 'entity', name: 'transport-belt'},
				to: {type: 'entity', name: 'fast-transport-belt', quality: 'rare'},
			},
			{
				index: 9,
				from: {type: 'entity', name: 'fast-transport-belt'},
				to: {type: 'entity', name: 'express-transport-belt'},
			},
			{
				index: 10,
				from: {type: 'entity', name: 'express-transport-belt'},
				to: {type: 'entity', name: 'turbo-transport-belt'},
			},
			{
				index: 11,
				from: {type: 'entity', name: 'underground-belt'},
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
			{
				index: 12,
				from: {type: 'entity', name: 'fast-underground-belt'},
				to: {type: 'entity', name: 'express-underground-belt'},
			},
			{
				index: 13,
				from: {type: 'entity', name: 'express-underground-belt'},
				to: {type: 'entity', name: 'turbo-underground-belt'},
			},
		],
	},
};
let nextLibraryRecordNumber = 1;
export const mappingInstructions =
	'Drag this From and To pair to move it, or focus either endpoint and press Control plus an arrow key. Press Delete to clear the focused endpoint.';

export function openUpgradePlanner() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
}

export function openBlueprintEditor() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
}

export async function choosePlanner(user: ReturnType<typeof userEvent.setup>, label: string) {
	await user.click(screen.getByRole('button', {name: 'Load planner to replace draft'}));
	await user.click(screen.getByRole('button', {name: label}));
}

export async function chooseSignal(user: ReturnType<typeof userEvent.setup>, label: string) {
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null && label.startsWith('Signal ')) {
		await user.click(screen.getByRole('tab', {name: 'Signals'}));
	}
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null) {
		await searchSignals(user, label);
	}
	await user.click(screen.getByRole('button', {name: `Choose ${label}`}));
	const confirm = screen.queryByRole('button', {name: 'Confirm'});
	if (confirm !== null) {
		await user.click(confirm);
	}
}

export async function searchSignals(user: ReturnType<typeof userEvent.setup>, searchText: string) {
	if (screen.queryByRole('searchbox', {name: 'Search'}) === null) {
		await user.click(screen.getByRole('button', {name: 'Search'}));
	}
	const search = screen.getByRole('searchbox', {name: 'Search'});
	await user.clear(search);
	await user.type(search, searchText);
}

export function choosePlannerWithClicks(label: string) {
	fireEvent.click(screen.getByRole('button', {name: 'Load planner to replace draft'}));
	fireEvent.click(screen.getByRole('button', {name: label}));
}

export function chooseSignalWithClicks(label: string) {
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null && label.startsWith('Signal ')) {
		fireEvent.click(screen.getByRole('tab', {name: 'Signals'}));
	}
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null) {
		if (screen.queryByRole('searchbox', {name: 'Search'}) === null) {
			fireEvent.click(screen.getByRole('button', {name: 'Search'}));
		}
		fireEvent.change(screen.getByRole('searchbox', {name: 'Search'}), {target: {value: label}});
	}
	fireEvent.click(screen.getByRole('button', {name: `Choose ${label}`}));
	const confirm = screen.queryByRole('button', {name: 'Confirm'});
	if (confirm !== null) {
		fireEvent.click(confirm);
	}
}

export function firstEmptyMappingSourceButton(): HTMLButtonElement {
	const [button] = screen.getAllByRole<HTMLButtonElement>('button', {name: 'Choose source for new mapping'});
	return button;
}

export function renderedMappingRows(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>('[data-mapping-key]')];
}

export function clearAllMappings() {
	while (renderedMappingRows().length > 0) {
		const [row] = renderedMappingRows();
		const mappingId = row.dataset.mappingKey ?? '';
		for (const slot of within(row).getAllByRole('button')) {
			fireEvent.contextMenu(slot);
		}
		if (document.querySelector(`[data-mapping-key="${mappingId}"]`) !== null) {
			throw new Error(`Upgrade mapping ${mappingId} survived clearing both endpoints.`);
		}
	}
}

export function mappingSlotIndex(button: HTMLElement): number {
	const row = button.closest('[data-mapping-key]');
	const parent = row?.parentElement;
	if (row === null || parent === null || parent === undefined) {
		throw new Error('Expected the mapping button to belong to a planner slot.');
	}
	return [...parent.children].indexOf(row);
}

function accessibleName(element: Element): string | null {
	const explicitLabel = element.getAttribute('aria-label');
	if (explicitLabel !== null) {
		return explicitLabel;
	}
	const labelledBy = element.getAttribute('aria-labelledby');
	if (labelledBy !== null) {
		return document.getElementById(labelledBy)?.textContent ?? null;
	}
	if (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element.labels?.[0]?.textContent ?? element.textContent;
	}
	return element.textContent;
}

export function interactionState() {
	const activeElement = document.activeElement;
	return {
		activeElement:
			activeElement === null
				? null
				: {
						name: accessibleName(activeElement),
						tagName: activeElement.tagName,
					},
		dialogStack: [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].map(
			(dialog) => ({
				ariaHidden: dialog.getAttribute('aria-hidden'),
				inert: dialog.inert,
				modal: dialog.getAttribute('aria-modal'),
				name: accessibleName(dialog),
				role: dialog.getAttribute('role'),
			}),
		),
	};
}

export async function applyPlanner(
	user: ReturnType<typeof userEvent.setup>,
	direction: 'upgrade' | 'downgrade' = 'upgrade',
) {
	await user.click(
		screen.getByRole('button', {
			name: direction === 'upgrade' ? 'Apply Upgrade' : 'Apply Downgrade',
		}),
	);
}

export function storedPlanner(id: string, planner: UpgradePlanner, label: string, position: number): LibraryRecord {
	return {
		id,
		createdOn: 0,
		updatedOn: 0,
		data: serializeBlueprint({upgrade_planner: planner}),
		gameData: {type: 'upgrade_planner', label, icons: []},
		parentId: LIBRARY_ROOT_ID,
		position,
	};
}

export function largeNestedBookFixture() {
	const rootBlueprint = deserializeBlueprint(readFixtureFile('txt/nested-book.txt'));
	const book = rootBlueprint.blueprint_book;
	const selectedBlueprint = book?.blueprints[0];
	const nestedBook = book?.blueprints[1];
	if (book === undefined || selectedBlueprint?.blueprint === undefined || nestedBook === undefined) {
		throw new Error('Expected the nested-book fixture to contain a blueprint followed by a nested book.');
	}
	selectedBlueprint.blueprint.icons = [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}];
	book.blueprints = [
		selectedBlueprint,
		...Array.from({length: 100}, (_, index) => ({
			...structuredClone(nestedBook),
			index: (index + 1) * 100,
		})),
	];
	return {rootBlueprint, selectedBlueprint};
}

/**
 * Installs the Blueprint Library database spies every TransformPanel suite
 * shares, backed by the caller's in-memory record list.
 */
export function installLibraryDbMocks(libraryRecords: LibraryRecord[]) {
	nextLibraryRecordNumber = 1;
	vi.spyOn(db, 'listLibraryChildren').mockImplementation(async (parentId) =>
		Promise.resolve(libraryRecords.filter((record) => record.parentId === parentId)),
	);
	vi.spyOn(db, 'saveLibraryCopy').mockImplementation(async (input) => {
		const record: LibraryRecord = {
			id: `saved-planner-${nextLibraryRecordNumber.toString()}`,
			createdOn: nextLibraryRecordNumber,
			updatedOn: nextLibraryRecordNumber,
			data: input.data,
			gameData: structuredClone(input.gameData),
			selection: input.selection,
			parentId: input.destination.parentId,
			position: input.destination.position,
		};
		nextLibraryRecordNumber += 1;
		libraryRecords.push(record);
		return Promise.resolve(record);
	});
	vi.spyOn(db, 'updateLibraryRecord').mockImplementation(async (input) => {
		const index = libraryRecords.findIndex((record) => record.id === input.id);
		if (index < 0) {
			throw new Error(`Missing library record: ${input.id}`);
		}
		const current = libraryRecords[index];
		const record: LibraryRecord = {
			...current,
			...structuredClone(input.content),
			updatedOn: current.updatedOn + 1,
		};
		libraryRecords[index] = record;
		return Promise.resolve(record);
	});
	vi.spyOn(db, 'deleteLibraryRecord').mockImplementation(async ({id}) => {
		await Promise.resolve();
		const index = libraryRecords.findIndex((record) => record.id === id);
		if (index < 0) {
			throw new Error(`Missing library record: ${id}`);
		}
		libraryRecords.splice(index, 1);
	});
}
