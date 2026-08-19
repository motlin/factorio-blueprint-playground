import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {expect, userEvent, within} from 'storybook/test';

import {LIBRARY_ROOT_ID, type LibraryRecord} from '../../storage/db';
import {BlueprintLibrary, type BlueprintLibraryLocation} from './BlueprintLibrary';

const libraryRecords = [
	{
		id: 'rail-book',
		createdOn: 1,
		updatedOn: 1,
		data: 'rail-book-data',
		gameData: {
			type: 'blueprint_book',
			label: 'Rail network',
			description: 'Intersections, stackers, and stations.',
			icons: [{type: 'item', name: 'blueprint-book'}],
		},
		parentId: LIBRARY_ROOT_ID,
		position: 0,
	},
	{
		id: 'belt-upgrades',
		createdOn: 2,
		updatedOn: 2,
		data: 'belt-upgrades-data',
		gameData: {
			type: 'upgrade_planner',
			label: 'Belt upgrades',
			description: 'Yellow belts through express belts.',
			icons: [{type: 'item', name: 'upgrade-planner'}],
		},
		parentId: LIBRARY_ROOT_ID,
		position: 1,
	},
	{
		id: 'station-book',
		createdOn: 3,
		updatedOn: 3,
		data: 'station-book-data',
		gameData: {
			type: 'blueprint_book',
			label: 'Station plans',
			description: 'Nested station books.',
			icons: [{type: 'item', name: 'blueprint-book'}],
		},
		parentId: 'rail-book',
		position: 0,
	},
	{
		id: 'rail-junction',
		createdOn: 4,
		updatedOn: 4,
		data: 'rail-junction-data',
		gameData: {
			type: 'blueprint',
			label: 'Four-way junction',
			description: 'A compact rail crossing.',
			icons: [{type: 'item', name: 'blueprint'}],
		},
		parentId: 'rail-book',
		position: 1,
	},
	{
		id: 'stacker-book',
		createdOn: 5,
		updatedOn: 5,
		data: 'stacker-book-data',
		gameData: {
			type: 'blueprint_book',
			label: 'Stacker variants',
			description: 'Train stackers grouped by size.',
			icons: [{type: 'item', name: 'blueprint-book'}],
		},
		parentId: 'station-book',
		position: 0,
	},
] satisfies LibraryRecord[];

function BlueprintLibraryStory({
	initialLocation,
	records = libraryRecords,
}: {
	initialLocation?: BlueprintLibraryLocation;
	records?: readonly LibraryRecord[];
}) {
	const [location, setLocation] = useState<BlueprintLibraryLocation>(initialLocation ?? {shelf: 'library'});
	return (
		<BlueprintLibrary
			historyRecords={[]}
			libraryRecords={records}
			location={location}
			onLocationChange={setLocation}
		/>
	);
}

const meta = {
	title: 'Library/BlueprintLibrary',
	component: BlueprintLibraryStory,
	parameters: {layout: 'fullscreen'},
	decorators: [
		(Story) => (
			<div style={{boxSizing: 'border-box', minHeight: '100vh', padding: 24}}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof BlueprintLibraryStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OuterFrameAndTitleBar: Story = {
	tags: ['visual-conformance'],
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const libraryWindow = canvas.getByRole('region', {name: 'Blueprint Library'});
		const title = within(libraryWindow).getByRole('heading', {level: 1, name: 'Blueprint Library'});
		const deepFrame = libraryWindow.querySelector<HTMLElement>('.blueprint-library__inside');
		const shelfTabList = within(libraryWindow).getByRole('tablist', {name: 'Blueprint Library shelves'});
		const libraryTab = within(libraryWindow).getByRole('tab', {name: 'My blueprints'});
		const historyTab = within(libraryWindow).getByRole('tab', {name: 'Import history'});

		await expect(libraryWindow).toHaveAttribute('data-factorio-style', 'inset_frame_container_frame');
		await expect(title.parentElement).toHaveAttribute('data-factorio-style', 'frame_header_flow');
		await expect(title.parentElement?.querySelector('svg')).toBeNull();
		await expect(deepFrame).toHaveAttribute('data-factorio-style', 'inside_deep_frame');
		await expect(shelfTabList).toHaveAttribute('data-factorio-style', 'tabbed_pane_with_no_side_padding');
		await expect(libraryTab).toHaveAttribute('data-factorio-style', 'tab');
		await expect(libraryTab).toHaveAttribute('data-source-shelf', 'private-shelf');
		await expect(libraryTab).toHaveAttribute('data-website-shelf', 'Library');
		await expect(historyTab).toHaveAttribute('data-source-shelf', 'website-only');
		await expect(historyTab).toHaveAttribute('data-website-shelf', 'History');
		await expect(shelfTabList.querySelector('svg')).toBeNull();
		await expect(libraryTab).toHaveAttribute('tabindex', '0');

		libraryTab.focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect(historyTab).toHaveFocus();
		await expect(historyTab).toHaveAttribute('aria-selected', 'true');
		await expect(within(libraryWindow).getByRole('tabpanel')).toHaveTextContent('Import History');
	},
};

export const NestedBookNavigationAndFocusRestoration: Story = {
	tags: ['visual-conformance'],
	args: {
		initialLocation: {shelf: 'library', book: 'station-book'},
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const navigation = canvas.getByRole('navigation', {name: 'Current book'});
		const rootButton = within(navigation).getByRole('button', {name: 'Go to book: My blueprints'});
		const railBookButton = within(navigation).getByRole('button', {
			name: 'Go to book: Rail network',
		});
		const stationBookButton = within(navigation).getByRole('button', {
			name: 'Current book: Station plans',
		});

		await expect(navigation).toHaveAttribute('data-factorio-source', 'BlueprintBookGui::buildNavigationPart');
		await expect(rootButton.parentElement).toHaveAttribute('data-book-depth', '0');
		await expect(railBookButton.parentElement).toHaveAttribute('data-book-depth', '1');
		await expect(stationBookButton.parentElement).toHaveAttribute('data-book-depth', '2');
		await expect(stationBookButton).toHaveAttribute('aria-current', 'location');
		await expect(stationBookButton).toHaveAttribute('aria-pressed', 'true');
		await expect(within(navigation).getByText('Current book')).toBeVisible();
		await expect(canvas.getByRole('heading', {level: 2, name: 'Station plans'})).toBeVisible();
		await expect(canvas.getByText('1 item')).toBeVisible();

		rootButton.focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(railBookButton).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(stationBookButton).toHaveFocus();
		await userEvent.keyboard('{Home}');
		await expect(rootButton).toHaveFocus();
		await userEvent.keyboard('{End}');
		await expect(stationBookButton).toHaveFocus();

		await userEvent.keyboard('{ArrowLeft}');
		const stationRecord = await canvas.findByRole('button', {name: 'Open book Station plans'});
		await expect(canvas.getByRole('heading', {level: 2, name: 'Rail network'})).toBeVisible();
		await expect(stationRecord).toHaveFocus();

		await userEvent.keyboard('{Enter}');
		const stackerRecord = await canvas.findByRole('button', {name: 'Open book Stacker variants'});
		await expect(canvas.getByRole('heading', {level: 2, name: 'Station plans'})).toHaveFocus();
		stackerRecord.focus();
		await userEvent.keyboard('{Escape}');
		await expect(await canvas.findByRole('button', {name: 'Open book Station plans'})).toHaveFocus();
	},
};

export const EmptyLibraryShelf: Story = {
	tags: ['visual-conformance'],
	args: {
		records: [],
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const locationHeading = canvas.getByRole('heading', {level: 2, name: 'My blueprints'});
		const emptyState = canvas.getByRole('status');
		const recordsSurface = emptyState.parentElement;

		await expect(locationHeading.parentElement?.parentElement).toHaveAttribute(
			'data-factorio-source',
			'BlueprintBookRecordWidget::BlueprintBookRecordWidget',
		);
		await expect(canvas.getByText('Blueprint shelf')).toBeVisible();
		await expect(canvas.getByText('0 items')).toBeVisible();
		await expect(emptyState).toHaveAttribute('data-factorio-source', 'BlueprintShelfWidget::updateRecords');
		await expect(emptyState.querySelector('.blueprint-library__empty-copy')).toHaveAttribute(
			'data-website-extension',
			'empty-shelf-help',
		);
		await expect(emptyState.querySelectorAll('.blueprint-library__empty-slot')).toHaveLength(10);
		await expect(recordsSurface).toHaveClass('blueprint-library__records-surface');
	},
};

export const StaleBookRecovery: Story = {
	tags: ['visual-conformance'],
	args: {
		initialLocation: {shelf: 'library', book: 'removed-book'},
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const staleState = canvas.getByRole('status');
		const rootLocation = canvas.getByRole('heading', {level: 2, name: 'My blueprints'});

		await expect(staleState).toHaveAttribute(
			'data-factorio-source',
			'BlueprintLibraryGui::updateOpenedBlueprintBook',
		);
		await expect(staleState).toHaveAttribute('data-website-extension', 'stale-book-recovery');
		await expect(rootLocation).toBeVisible();
		await expect(canvas.getByText('2 items')).toBeVisible();
		await expect(canvasElement).not.toHaveTextContent('removed-book');

		await userEvent.click(canvas.getByRole('button', {name: 'Show My blueprints'}));
		await expect(canvas.queryByRole('status')).toBeNull();
		await expect(canvas.getByRole('region', {name: 'Blueprint records'})).toBeVisible();
	},
};
