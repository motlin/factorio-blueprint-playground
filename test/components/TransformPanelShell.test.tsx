import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Profiler} from 'react';
import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {type LibraryRecord} from '../../src/storage/db';
import {
	blueprint,
	choosePlanner,
	chooseSignal,
	firstEmptyMappingSourceButton,
	installLibraryDbMocks,
	interactionState,
	largeNestedBookFixture,
	openUpgradePlanner,
	renderedMappingRows,
} from './transformPanelSupport';

const {analysisCounts, libraryRecords, navigate} = vi.hoisted(() => ({
	analysisCounts: {metadataIcons: 0, upgradeRules: 0},
	libraryRecords: [] as LibraryRecord[],
	navigate: vi.fn<(options: unknown) => void>(),
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => libraryRecords,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => navigate,
}));
vi.mock('../../src/transform/metadataSubstitution', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../src/transform/metadataSubstitution')>();
	return {
		...original,
		analyzeMetadataIcons: (...parameters: Parameters<typeof original.analyzeMetadataIcons>) => {
			analysisCounts.metadataIcons += 1;
			return original.analyzeMetadataIcons(...parameters);
		},
	};
});
vi.mock('../../src/transform/upgradePlanner', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../src/transform/upgradePlanner')>();
	return {
		...original,
		analyzeUpgradeRules: (...parameters: Parameters<typeof original.analyzeUpgradeRules>) => {
			analysisCounts.upgradeRules += 1;
			return original.analyzeUpgradeRules(...parameters);
		},
	};
});

describe('TransformPanel shell, dialog focus, and render bounds', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		analysisCounts.metadataIcons = 0;
		analysisCounts.upgradeRules = 0;
		libraryRecords.length = 0;
		navigate.mockReset();
		installLibraryDbMocks(libraryRecords);
	});

	test('renders nothing without a blueprint or for a deconstruction planner', () => {
		const {container, rerender} = render(<TransformPanel />);
		expect(container.innerHTML).toBe('');

		rerender(
			<TransformPanel
				blueprint={{
					deconstruction_planner: {item: 'deconstruction-planner', version: 0, settings: {}},
				}}
			/>,
		);
		expect(container.innerHTML).toBe('');
	});

	test('keeps transforms in a compact toolbelt and shows visual mappings in the popup', () => {
		render(<TransformPanel blueprint={blueprint} />);

		expect({
			applyButton: screen.queryByRole('button', {name: 'Apply changes'}),
			blueprintEditorExpanded: screen
				.getByRole('button', {name: 'Open Blueprint Editor'})
				.getAttribute('aria-expanded'),
			dialog: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
			toolOrder: [...screen.getByRole('toolbar', {name: 'Blueprint tools'}).querySelectorAll('button')].map(
				(button) => button.getAttribute('aria-label'),
			),
			toolExpanded: screen.getByRole('button', {name: 'Open Upgrade Planner'}).getAttribute('aria-expanded'),
		}).toStrictEqual({
			applyButton: null,
			blueprintEditorExpanded: 'false',
			dialog: null,
			toolOrder: ['Open Blueprint Editor', 'Open Upgrade Planner'],
			toolExpanded: 'false',
		});

		openUpgradePlanner();
		const dialog = screen.getByRole('dialog', {name: 'Upgrade Planner'});
		const body = dialog.querySelector<HTMLElement>('.upgrade-planner-dialog__body');
		if (body === null) {
			throw new Error('Expected the Upgrade Planner body.');
		}
		const editor = within(dialog).getByRole('region', {name: 'Upgrade planner editor'});
		const mapperScroll = within(editor).getByRole('region', {name: 'Upgrade mappings'});
		const application = within(dialog)
			.getByRole('heading', {name: 'Website application'})
			.closest<HTMLElement>('section');
		if (application === null) {
			throw new Error('Expected the website application section.');
		}
		const loader = application.querySelector<HTMLElement>('.upgrade-planner-loader');
		if (loader === null) {
			throw new Error('Expected the planner draft loader.');
		}
		const loadPlanner = within(loader).getByRole('button', {name: 'Load planner to replace draft'});
		const draftSource = within(loader).getByLabelText('Draft source: Default Upgrade');
		const dialogHeading = within(dialog).getByRole('heading', {name: 'Upgrade Planner'});
		const plannerContext = within(dialog).getByRole('navigation', {
			name: 'Upgrade planner blueprint context',
		});
		const plannerScope = within(dialog).getByRole('radiogroup', {name: 'Apply mappings to'});
		expect(dialog.getAttribute('aria-labelledby')).toBe(dialogHeading.id);
		expect({
			applicationExtension: application.dataset.websiteExtension,
			bodyClass: body.className,
			bookWidePanel: within(body).getByRole('heading', {name: 'Book-wide replacements'}).closest('section')
				?.className,
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			closeButton: within(dialog).getByRole('button', {name: 'Close Upgrade Planner'}).getAttribute('aria-label'),
			closeSource: within(dialog)
				.getByRole('button', {name: 'Close Upgrade Planner'})
				.getAttribute('data-factorio-source'),
			context: plannerContext.textContent,
			contextExtension: plannerContext.parentElement?.dataset.websiteExtension,
			dialog: dialog.getAttribute('aria-modal'),
			editorClass: editor.className,
			editorStyle: editor.dataset.factorioStyle,
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.queryByRole('button', {name}),
			),
			fillerStyle: editor.querySelector<HTMLElement>('.upgrade-planner-dialog__filler')?.dataset.factorioStyle,
			footerElement: dialog.lastElementChild?.tagName,
			footerExtension:
				dialog.lastElementChild instanceof HTMLElement
					? dialog.lastElementChild.dataset.websiteExtension
					: undefined,
			fromToGroup: within(editor).getByRole('group', {name: 'From and To mappings'}).getAttribute('aria-label'),
			headerElement: dialog.firstElementChild?.tagName,
			headerIcon: dialog.querySelector('.upgrade-planner-dialog__identity-icon img')?.getAttribute('src'),
			headerSource: dialog.firstElementChild?.getAttribute('data-factorio-source'),
			libraryState: within(dialog).getByLabelText('Planner library status').textContent,
			liveResult: screen.queryByText('Live result'),
			loader: {
				button: {
					describedSource: document
						.getElementById(loadPlanner.getAttribute('aria-describedby') ?? '')
						?.getAttribute('aria-label'),
					expanded: loadPlanner.getAttribute('aria-expanded'),
					text: loadPlanner.textContent,
					websiteAction: loadPlanner.getAttribute('data-website-action'),
				},
				source: {
					icon: draftSource.querySelector('img')?.getAttribute('src'),
					label: draftSource.querySelector('strong')?.textContent,
				},
			},
			loaderInsideEditor: within(editor).queryByText('Load planner'),
			loaderExtension:
				application.querySelector<HTMLElement>('.upgrade-planner-loader')?.dataset.websiteExtension,
			mapperClass: mapperScroll.className,
			mapperStyle: mapperScroll.dataset.factorioStyle,
			mappingHeadingGroups: [...editor.querySelectorAll('.upgrade-mapping-grid__headings > div')].map(
				(group) => group.textContent,
			),
			mappingSlots: editor.querySelectorAll('[data-upgrade-mapping-slot]').length,
			modeButtons: ['Upgrade', 'Downgrade', 'Strip quality'].map((name) => screen.queryByRole('button', {name})),
			nativeScopeSelect: within(dialog).queryByRole('combobox', {name: 'Apply to'}),
			operationButtons: ['Save to Library', 'Apply Upgrade', 'Apply Downgrade'].map(
				(name) => screen.queryByRole('button', {name})?.textContent ?? null,
			),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			scopeExtension: plannerScope.dataset.websiteExtension,
			scopeOptions: within(plannerScope)
				.getAllByRole<HTMLInputElement>('radio')
				.map((radio) => ({
					checked: radio.checked,
					disabled: radio.disabled,
					label: radio.parentElement?.textContent,
					value: radio.value,
				})),
			sectionOrder: [...body.children].map(
				(section) =>
					section.getAttribute('data-factorio-style') ?? section.getAttribute('data-website-extension'),
			),
			scrollTabIndex: mapperScroll.tabIndex,
			sourceIcon: screen
				.getByRole('button', {name: 'Choose source, currently Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			bookWideReplacements: screen.getByRole('heading', {name: 'Book-wide replacements'}).textContent,
			websiteLabel: within(dialog).queryByText('Website extension')?.textContent,
		}).toStrictEqual({
			applicationExtension: 'planner-application',
			bodyClass: 'upgrade-planner-dialog__body',
			bookWidePanel: 'panel-hole transform-workflow__section book-wide-replacements',
			changeIn: null,
			closeButton: 'Close Upgrade Planner',
			closeSource: 'GameGuiWithControllerInventory::closeButton',
			context: 'This blueprint or book›Untitled blueprint',
			contextExtension: 'planner-context',
			dialog: 'true',
			editorClass: 'factorio-frame factorio-frame--shallow upgrade-planner-dialog__editor-shell',
			editorStyle: 'entity_frame',
			exportActions: [null, null, null, null],
			fillerStyle: 'entity_frame_filler',
			footerElement: 'FOOTER',
			footerExtension: 'planner-actions',
			fromToGroup: 'From and To mappings',
			headerElement: 'HEADER',
			headerIcon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			headerSource: 'UpgradeItemGui::UpgradeItemGui',
			libraryState: 'Local draft · not in Blueprint Library',
			liveResult: null,
			loader: {
				button: {
					describedSource: 'Draft source: Default Upgrade',
					expanded: 'false',
					text: 'Load planner…',
					websiteAction: 'replace-planner-draft',
				},
				source: {
					icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
					label: 'Default Upgrade',
				},
			},
			loaderInsideEditor: null,
			loaderExtension: 'planner-library-loader',
			mapperClass: 'factorio-scroll-frame upgrade-planner-dialog__scroll-region',
			mapperStyle: 'mappers_scroll_pane',
			mappingHeadingGroups: ['FromTo', 'FromTo', 'FromTo', 'FromTo'],
			mappingSlots: 20,
			modeButtons: [null, null, null],
			nativeScopeSelect: null,
			operationButtons: ['Save to Library', 'Apply Upgrade', 'Apply Downgrade'],
			preserveCapitalization: null,
			scopeExtension: 'planner-application-scope',
			scopeOptions: [
				{
					checked: true,
					disabled: false,
					label: 'Current selectionThis blueprint or book',
					value: 'selection',
				},
			],
			sectionOrder: ['entity_frame', 'planner-application', null],
			scrollTabIndex: 0,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
			bookWideReplacements: 'Book-wide replacements',
			websiteLabel: 'Website extension',
		});
	});

	test('returns focus to the Upgrade Planner tool after its dialog closes', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);
		const tool = screen.getByRole('button', {name: 'Open Upgrade Planner'});

		await user.click(tool);
		expect(document.activeElement).toBe(screen.getByRole('region', {name: 'Upgrade mappings'}));

		await user.click(screen.getByRole('button', {name: 'Close Upgrade Planner'}));
		await waitFor(() => {
			expect(document.activeElement).toBe(tool);
		});
	});

	test('isolates the dirty-close confirmation and restores focus through the planner stack', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);
		const tool = screen.getByRole('button', {name: 'Open Upgrade Planner'});

		await user.click(tool);
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const plannerName = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(plannerName);
		await user.type(plannerName, 'Dirty planner');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		const closePlanner = screen.getByRole('button', {name: 'Close Upgrade Planner'});
		await user.click(closePlanner);

		const confirmation = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
		expect(interactionState()).toStrictEqual({
			activeElement: {name: 'Keep editing', tagName: 'BUTTON'},
			dialogStack: [
				{
					ariaHidden: 'true',
					inert: true,
					modal: 'true',
					name: 'Upgrade Planner',
					role: 'dialog',
				},
				{
					ariaHidden: null,
					inert: false,
					modal: 'true',
					name: 'Discard unsaved changes?',
					role: 'alertdialog',
				},
			],
		});

		tool.focus();
		expect(document.activeElement).toBe(within(confirmation).getByRole('button', {name: 'Keep editing'}));

		fireEvent.keyDown(window, {key: 'Escape'});
		await waitFor(() => {
			expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).toBeNull();
			expect(document.activeElement).toBe(closePlanner);
		});
		expect(screen.getByRole('dialog', {name: 'Upgrade Planner'}).inert).toBe(false);

		await user.click(closePlanner);
		await user.click(
			within(screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'})).getByRole('button', {
				name: 'Discard changes',
			}),
		);
		await waitFor(() => {
			expect(screen.queryByRole('dialog', {name: 'Upgrade Planner'})).toBeNull();
			expect(document.activeElement).toBe(tool);
		});
	});

	test('bounds renders and analysis while editing mappings and icons in a large nested book', async () => {
		const user = userEvent.setup();
		const {rootBlueprint, selectedBlueprint} = largeNestedBookFixture();
		const commits: string[] = [];
		render(
			<Profiler
				id="transform-panel"
				onRender={(id, phase) => {
					commits.push(`${id}:${phase}`);
				}}
			>
				<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />
			</Profiler>,
		);
		const initialCommitCount = commits.length;
		let previousCommitCount = commits.length;
		const commitsSincePreviousInteraction = () => {
			const count = commits.length - previousCommitCount;
			previousCommitCount = commits.length;
			return count;
		};

		openUpgradePlanner();
		const openPlannerCommitCount = commitsSincePreviousInteraction();
		await choosePlanner(user, 'Empty Planner');
		const loadEmptyPlannerCommitCount = commitsSincePreviousInteraction();

		await user.click(screen.getByRole('radio', {name: /^Entire book/}));
		const rootScopeCommitCount = commitsSincePreviousInteraction();
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await chooseSignal(user, 'Fast transport belt');
		const firstMappingCommitCount = commitsSincePreviousInteraction();

		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Fast inserter');
		await user.click(screen.getByRole('button', {name: 'Choose target for Fast inserter'}));
		await chooseSignal(user, 'Inserter');
		const secondMappingCommitCount = commitsSincePreviousInteraction();

		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await chooseSignal(user, 'Signal blue');
		await user.click(screen.getByRole('button', {name: 'Done'}));
		const iconChangeCommitCount = commitsSincePreviousInteraction();

		expect({
			analysisCounts,
			mappings: renderedMappingRows().map((row) => row.getAttribute('aria-label')),
			renderCommits: {
				firstMapping: firstMappingCommitCount,
				iconChange: iconChangeCommitCount,
				initial: initialCommitCount,
				loadEmptyPlanner: loadEmptyPlannerCommitCount,
				openPlanner: openPlannerCommitCount,
				rootScope: rootScopeCommitCount,
				secondMapping: secondMappingCommitCount,
			},
		}).toStrictEqual({
			analysisCounts: {
				metadataIcons: 1,
				upgradeRules: 8,
			},
			mappings: ['Mapping from Transport belt to Fast transport belt', 'Mapping from Fast inserter to Inserter'],
			renderCommits: {
				firstMapping: 6,
				iconChange: 8,
				initial: 1,
				loadEmptyPlanner: 4,
				openPlanner: 1,
				rootScope: 1,
				secondMapping: 6,
			},
		});
	});

	test('opens the Factorio tools with B and U except while editing text or choosing an icon', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		fireEvent.keyDown(window, {code: 'KeyB'});
		const blueprintEditor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		expect(blueprintEditor.getAttribute('aria-modal')).toBe('true');

		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		fireEvent.keyDown(window, {code: 'KeyU'});
		expect({
			blueprintEditorAriaHidden: blueprintEditor.getAttribute('aria-hidden'),
			blueprintEditorInert: blueprintEditor.inert,
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			upgradePlanner: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
		}).toStrictEqual({
			blueprintEditorAriaHidden: 'true',
			blueprintEditorInert: true,
			picker: 'true',
			upgradePlanner: null,
		});

		fireEvent.keyDown(window, {code: 'Escape', key: 'Escape'});
		fireEvent.keyDown(window, {code: 'KeyU'});
		expect({
			blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			upgradePlanner: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
		}).toStrictEqual({blueprintEditor: null, upgradePlanner: 'true'});

		const findInput = screen.getByRole<HTMLInputElement>('textbox', {name: 'Find'});
		await user.type(findInput, 'b');
		fireEvent.keyDown(findInput, {code: 'KeyB'});
		expect({
			blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			find: screen.getByRole<HTMLInputElement>('textbox', {name: 'Find'}).value,
			upgradePlanner: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
		}).toStrictEqual({blueprintEditor: null, find: 'b', upgradePlanner: 'true'});
	});
});
