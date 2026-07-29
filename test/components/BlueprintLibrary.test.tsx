import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, test} from 'vite-plus/test';

import {BlueprintLibrary, type BlueprintLibraryLocation} from '../../src/components/library/BlueprintLibrary';
import {LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';

const libraryRecords: LibraryRecord[] = [
	{
		id: 'book-alice',
		createdOn: 0,
		updatedOn: 0,
		data: 'alice-book-data',
		gameData: {type: 'blueprint_book', label: 'Alice rail book', icons: []},
		parentId: LIBRARY_ROOT_ID,
		position: 0,
	},
	{
		id: 'planner-root',
		createdOn: 0,
		updatedOn: 0,
		data: 'root-planner-data',
		gameData: {type: 'upgrade_planner', label: 'Main bus upgrades', icons: []},
		parentId: LIBRARY_ROOT_ID,
		position: 1,
	},
	{
		id: 'book-bob',
		createdOn: 0,
		updatedOn: 0,
		data: 'bob-book-data',
		gameData: {type: 'blueprint_book', label: 'Bob stations', icons: []},
		parentId: 'book-alice',
		position: 0,
	},
	{
		id: 'blueprint-charlie',
		createdOn: 0,
		updatedOn: 0,
		data: 'charlie-blueprint-data',
		gameData: {type: 'blueprint', label: 'Charlie unloaders', icons: []},
		parentId: 'book-bob',
		position: 0,
	},
];

function StatefulLibrary({initialLocation}: {initialLocation: BlueprintLibraryLocation}) {
	const [location, setLocation] = useState(initialLocation);
	return (
		<BlueprintLibrary
			location={location}
			libraryRecords={libraryRecords}
			historyRecords={[]}
			onLocationChange={setLocation}
		/>
	);
}

describe('BlueprintLibrary', () => {
	test('uses the Factorio library window frame and keyboard-reachable shelf chrome', () => {
		render(<StatefulLibrary initialLocation={{shelf: 'library'}} />);

		const libraryWindow = screen.getByRole('region', {name: 'Blueprint Library'});
		const title = within(libraryWindow).getByRole('heading', {level: 1, name: 'Blueprint Library'});
		const titleBar = title.parentElement;
		const deepFrame = libraryWindow.querySelector<HTMLElement>('.blueprint-library__inside');
		const shelfTabs = within(libraryWindow).getAllByRole('tab');

		expect({
			deepFrameClass: deepFrame?.className,
			deepFrameStyle: deepFrame?.dataset.factorioStyle,
			libraryWindowClass: libraryWindow.className,
			libraryWindowStyle: libraryWindow.dataset.factorioStyle,
			selectedShelfTabIndex: shelfTabs[0]?.tabIndex,
			titleBarClass: titleBar?.className,
			titleBarStyle: titleBar?.dataset.factorioStyle,
			titleGraphicCount: titleBar?.querySelectorAll('svg').length,
			unselectedShelfTabIndex: shelfTabs[1]?.tabIndex,
		}).toStrictEqual({
			deepFrameClass: 'factorio-frame factorio-frame--deep blueprint-library__inside',
			deepFrameStyle: 'inside_deep_frame',
			libraryWindowClass: 'factorio-frame factorio-frame--shallow blueprint-library',
			libraryWindowStyle: 'inset_frame_container_frame',
			selectedShelfTabIndex: 0,
			titleBarClass: 'factorio-title-bar blueprint-library__title-bar',
			titleBarStyle: 'frame_header_flow',
			titleGraphicCount: 0,
			unselectedShelfTabIndex: -1,
		});
	});

	test('navigates nested books and restores focus when returning to a parent', async () => {
		const user = userEvent.setup();
		render(<StatefulLibrary initialLocation={{shelf: 'library'}} />);

		await user.click(screen.getByRole('button', {name: 'Open book Alice rail book'}));
		expect(within(screen.getByRole('navigation', {name: 'Current book'})).getAllByRole('button')).toStrictEqual([
			expect.objectContaining({textContent: 'Library'}),
			expect.objectContaining({textContent: 'Alice rail book'}),
		]);

		await user.click(screen.getByRole('button', {name: 'Open book Bob stations'}));
		expect({
			childDisabled: screen.getByRole('button', {name: 'Charlie unloaders'}).getAttribute('aria-disabled'),
			locationHeading: screen.getByRole('heading', {name: 'Bob stations'}).textContent,
		}).toStrictEqual({
			childDisabled: 'true',
			locationHeading: 'Bob stations',
		});

		await user.click(screen.getByRole('button', {name: 'Alice rail book'}));
		expect({
			focusedControl: document.activeElement?.getAttribute('aria-label'),
			locationHeading: screen.getByRole('heading', {name: 'Alice rail book'}).textContent,
			visibleRecords: within(screen.getByRole('region', {name: 'Blueprint records'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		}).toStrictEqual({
			focusedControl: 'Open book Bob stations',
			locationHeading: 'Alice rail book',
			visibleRecords: ['Open book Bob stations'],
		});
	});

	test('supports shelf and record keyboard navigation while preserving the current book', () => {
		render(<StatefulLibrary initialLocation={{shelf: 'library', book: 'book-alice'}} />);

		const libraryTab = screen.getByRole('tab', {name: 'Library'});
		libraryTab.focus();
		fireEvent.keyDown(libraryTab, {key: 'ArrowRight'});
		expect({
			activeShelf: screen.getByRole('tab', {selected: true}).textContent,
			focusedControl: document.activeElement?.textContent,
		}).toStrictEqual({
			activeShelf: 'History',
			focusedControl: 'History',
		});

		fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'ArrowLeft'});
		expect(screen.getByRole('heading', {name: 'Alice rail book'}).textContent).toBe('Alice rail book');

		const nestedBook = screen.getByRole('button', {name: 'Open book Bob stations'});
		nestedBook.focus();
		fireEvent.keyDown(nestedBook, {key: 'Enter'});
		expect(screen.getByRole('heading', {name: 'Bob stations'}).textContent).toBe('Bob stations');
		fireEvent.keyDown(screen.getByRole('button', {name: 'Charlie unloaders'}), {key: 'Escape'});
		expect({
			focusedControl: document.activeElement?.getAttribute('aria-label'),
			locationHeading: screen.getByRole('heading', {name: 'Alice rail book'}).textContent,
		}).toStrictEqual({
			focusedControl: 'Open book Bob stations',
			locationHeading: 'Alice rail book',
		});
	});

	test('shows clear empty and stale-location states without exposing record identifiers', async () => {
		const user = userEvent.setup();
		const {rerender} = render(
			<BlueprintLibrary
				location={{shelf: 'library'}}
				libraryRecords={[]}
				historyRecords={[]}
				onLocationChange={() => undefined}
			/>,
		);
		expect(screen.getByRole('status').textContent).toBe(
			'Your library is empty.Saved blueprints and planners will appear here.',
		);

		function StaleLibrary() {
			const [location, setLocation] = useState<BlueprintLibraryLocation>({
				shelf: 'library',
				book: 'missing-database-id',
			});
			return (
				<BlueprintLibrary
					location={location}
					libraryRecords={libraryRecords}
					historyRecords={[]}
					onLocationChange={setLocation}
				/>
			);
		}
		rerender(<StaleLibrary />);
		expect(document.body.textContent).not.toContain('missing-database-id');
		await user.click(screen.getByRole('button', {name: 'Return to Library'}));
		expect(screen.getByRole('heading', {name: 'Library shelf'}).textContent).toBe('Library shelf');
	});
});
