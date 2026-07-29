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
] satisfies LibraryRecord[];

function BlueprintLibraryStory() {
	const [location, setLocation] = useState<BlueprintLibraryLocation>({shelf: 'library'});
	return (
		<BlueprintLibrary
			historyRecords={[]}
			libraryRecords={libraryRecords}
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
