import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {BlueprintEditorSourceMode} from '../../src/components/blueprint/panels/transform/useBlueprintEditorDraft';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {type LibraryRecord} from '../../src/storage/db';
import {
	blueprint,
	chooseSignal,
	installLibraryDbMocks,
	interactionState,
	openBlueprintEditor,
	openUpgradePlanner,
	searchSignals,
} from './transformPanelSupport';

const {libraryRecords, navigate} = vi.hoisted(() => ({
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

describe('TransformPanel Blueprint Editor drafts', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		libraryRecords.length = 0;
		navigate.mockReset();
		installLibraryDbMocks(libraryRecords);
	});

	test('keeps blueprint editing in its own popup', () => {
		const filterBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-1',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 1}]},
							},
						],
					},
					{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={filterBlueprint} />);

		openBlueprintEditor();
		const dialog = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		const settings = screen.getByRole('region', {name: 'Blueprint settings'});
		const settingsScroll = settings.querySelector('.blueprint-editor__settings-scroll');
		expect({
			bookWideReplacements: screen.queryByRole('heading', {name: 'Book-wide replacements'}),
			bodyClass: dialog.querySelector('.transform-workbench__body')?.className,
			bodySource: dialog.querySelector('.transform-workbench__body')?.getAttribute('data-factorio-source'),
			cleanup: screen.queryByRole('heading', {name: 'Cleanup'}),
			components: screen.getByRole('heading', {name: 'Components'}).textContent,
			description: screen.getByRole('textbox', {name: 'Blueprint description'}).textContent,
			dialog: dialog.getAttribute('aria-modal'),
			dialogSource: dialog.getAttribute('data-factorio-source'),
			footerElement: dialog.lastElementChild?.tagName,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			headerElement: dialog.firstElementChild?.tagName,
			iconReplacements: screen.queryByRole('button', {name: /Icon replacements/}),
			iconSlots: [1, 2, 3, 4].map((index) =>
				screen.getByRole('button', {name: `Choose icon ${index.toString()}`}).getAttribute('aria-label'),
			),
			title: dialog.querySelector('.blueprint-editor__title')?.textContent,
			plannerMappings: screen.queryByRole('group', {name: 'Planner operation'}),
			preview: screen.queryByRole('heading', {name: 'Preview'}),
			previewRegion: dialog.querySelector('[data-blueprint-preview]'),
			saveDestination: screen.queryByLabelText('Save destination'),
			settingsHeadings: [...(settingsScroll?.querySelectorAll('h4') ?? [])].map((heading) =>
				heading.textContent.trim(),
			),
			settingsScrollStyle: settingsScroll?.getAttribute('data-factorio-style'),
			settingsSource: settings.getAttribute('data-factorio-source'),
			textReplacement: screen.queryByRole('checkbox', {name: /Text replacement/}),
		}).toStrictEqual({
			bookWideReplacements: null,
			bodyClass: 'transform-workbench__body blueprint-editor__layout',
			bodySource: 'BlueprintSetupGui::insetFrameContainerHorizontalFlow',
			cleanup: null,
			components: 'Components',
			description: '',
			dialog: 'true',
			dialogSource: 'BlueprintSetupGui::BlueprintSetupGui',
			footerElement: 'FOOTER',
			filters: [true, true, true, true],
			headerElement: 'HEADER',
			iconReplacements: null,
			iconSlots: ['Choose icon 1', 'Choose icon 2', 'Choose icon 3', 'Choose icon 4'],
			title: '<Unnamed blueprint>',
			plannerMappings: null,
			preview: null,
			previewRegion: null,
			saveDestination: null,
			settingsHeadings: ['Icon', 'Description', 'Snap to grid', 'Components', 'Filters'],
			settingsScrollStyle: 'scroll_pane_under_subheader',
			settingsSource: 'BlueprintSettingsGui::BlueprintSettingsGui',
			textReplacement: null,
		});
	});

	test('keeps editor changes as a draft until they are saved', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled).toBe(true);
		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialog: null,
			navigation: [],
		});
	});

	test('commits a post-capture Blueprint Editor draft as the first root blueprint', async () => {
		const user = userEvent.setup();
		const onBlueprintCommit = vi.fn<(committedRoot: BlueprintString) => void>();
		const capturedBlueprint: BlueprintString = {
			blueprint: {item: 'blueprint', label: '', version: 0},
		};
		render(
			<TransformPanel
				blueprint={capturedBlueprint}
				blueprintEditorSourceMode={BlueprintEditorSourceMode.CapturedDraft}
				onBlueprintCommit={onBlueprintCommit}
			/>,
		);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		const createButton = screen.getByRole<HTMLButtonElement>('button', {name: 'Create blueprint'});
		expect({
			createDisabled: createButton.disabled,
			dialogState: interactionState(),
		}).toStrictEqual({
			createDisabled: false,
			dialogState: {
				activeElement: {name: 'Edit blueprint title', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Blueprint Editor',
						role: 'dialog',
					},
				],
			},
		});
		await user.click(createButton);
		await Promise.resolve();

		expect({
			commit: onBlueprintCommit.mock.calls,
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			commit: [[{blueprint: {item: 'blueprint', version: 0}}]],
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [],
		});
	});

	test('applies captured-draft tile, train, and vehicle defaults before the first commit', async () => {
		const user = userEvent.setup();
		const onBlueprintCommit = vi.fn<(committedRoot: BlueprintString) => void>();
		const capturedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 100, name: 'assembling-machine-3', position: {x: 0, y: 0}},
					{entity_number: 200, name: 'locomotive', position: {x: 1, y: 0}},
					{entity_number: 300, name: 'car', position: {x: 2, y: 0}},
				],
				tiles: [{name: 'concrete', position: {x: 0, y: 1}}],
			},
		};
		render(
			<TransformPanel
				blueprint={capturedBlueprint}
				blueprintEditorSourceMode={BlueprintEditorSourceMode.CapturedDraft}
				onBlueprintCommit={onBlueprintCommit}
			/>,
		);

		openBlueprintEditor();
		const filtersSection = screen.getByRole('heading', {name: 'Filters'}).closest('section');
		if (filtersSection === null) {
			throw new Error('Expected the captured blueprint filters section.');
		}
		expect(
			within(filtersSection)
				.getAllByRole<HTMLInputElement>('checkbox')
				.map((checkbox) => ({
					checked: checkbox.checked,
					label: checkbox.labels?.[0]?.textContent,
				})),
		).toStrictEqual([
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Tiles'},
			{checked: false, label: 'Trains'},
			{checked: false, label: 'Vehicles'},
		]);
		await user.click(screen.getByRole('button', {name: 'Create blueprint'}));

		expect(onBlueprintCommit.mock.calls).toStrictEqual([
			[
				{
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 100,
								name: 'assembling-machine-3',
								position: {x: 0, y: 0},
							},
						],
					},
				},
			],
		]);
	});

	test('dismisses an unchanged editor directly through both Escape and the title-bar close button', () => {
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		fireEvent.keyDown(window, {key: 'Escape'});
		expect(screen.queryByRole('dialog', {name: 'Blueprint Editor'})).toBeNull();

		openBlueprintEditor();
		fireEvent.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));
		expect({
			confirmation: screen.queryByRole('alertdialog', {name: 'Confirmation'}),
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({confirmation: null, dialog: null, navigation: []});
	});

	test('cancels an inline title edit before Escape closes the editor', async () => {
		const user = userEvent.setup();
		const titledBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Alice reactor',
				version: 0,
			},
		};
		render(<TransformPanel blueprint={titledBlueprint} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Cancelled reactor');
		await user.keyboard('{Escape}');

		expect({
			dialog: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			input: screen.queryByRole('textbox', {name: 'Blueprint title'}),
			title: screen.getByText('Alice reactor', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({dialog: 'true', input: null, title: 'Alice reactor'});

		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog', {name: 'Blueprint Editor'})).toBeNull();
	});

	test.each([
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Alice's new blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's new blueprint",
				caption: 'Set up new blueprint',
				contextLabel: 'New blueprint',
			},
			name: 'new root blueprint',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.CapturedDraft,
		},
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Alice's existing blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's existing blueprint",
				caption: 'Blueprint item',
				contextLabel: 'Existing blueprint',
			},
			name: 'existing blueprint item',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
		{
			blueprint: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's library book",
					version: 0,
					blueprints: [],
				},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's library book",
				caption: 'Blueprint book in the blueprint library',
				contextLabel: 'Blueprint library record',
			},
			name: 'blueprint library book',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Bob's child blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's library book › Bob's child blueprint",
				caption: 'Blueprint in the blueprint library',
				contextLabel: 'Child blueprint record',
			},
			name: 'child blueprint record',
			rootBlueprint: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's library book",
					version: 0,
					blueprints: [
						{
							index: 100,
							blueprint: {item: 'blueprint', label: "Bob's child blueprint", version: 0},
						},
					],
				},
			} satisfies BlueprintString,
			selectedPath: '1',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
	])(
		'labels the $name context and routes X through confirmClose',
		({blueprint: contextBlueprint, expected, rootBlueprint, selectedPath, sourceMode}) => {
			render(
				<TransformPanel
					blueprint={contextBlueprint}
					blueprintEditorSourceMode={sourceMode}
					rootBlueprint={rootBlueprint}
					selectedPath={selectedPath}
				/>,
			);

			openBlueprintEditor();
			const dialog = screen.getByRole('dialog', {name: 'Blueprint Editor'});
			const context = within(dialog).getByRole('navigation', {name: 'Blueprint context'});
			const close = within(dialog).getByRole('button', {name: 'Close Blueprint Editor'});
			const closeDescription = document.getElementById(close.getAttribute('aria-describedby') ?? '');
			const caption = within(dialog).getByRole('heading', {name: expected.caption});

			expect({
				caption: {
					source: caption.dataset.factorioSource,
					text: caption.textContent,
				},
				close: {
					action: close.dataset.factorioCloseAction,
					description: closeDescription?.textContent.trim(),
					source: close.dataset.factorioSource,
					title: close.title,
				},
				context: [...context.children].map((part) => ({
					current: part.getAttribute('aria-current'),
					text: part.textContent,
				})),
				contextExtension: context.dataset.websiteExtension,
				dialogDescription: dialog.getAttribute('aria-describedby'),
			}).toStrictEqual({
				caption: {
					source: 'BlueprintSetupGui::getTitle',
					text: expected.caption,
				},
				close: {
					action: 'request-close',
					description: 'Uncommitted changes require confirmation before they are discarded.',
					source: 'BlueprintSetupGui::confirmClose',
					title: 'Close Blueprint Editor (asks before discarding changes)',
				},
				context: [
					{current: null, text: expected.contextLabel},
					{current: null, text: '›'},
					{current: 'page', text: expected.breadcrumb},
				],
				contextExtension: 'record-context',
				dialogDescription: context.id,
			});
		},
	);

	test('keeps or discards dirty title, icon, description, and filter drafts on every close path', async () => {
		const user = userEvent.setup();
		const sourceBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Alice',
				description: 'Source description',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-1',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 1}]},
							},
						],
					},
					{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={sourceBlueprint} />);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Bob{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'Draft description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await searchSignals(user, 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('checkbox', {name: 'Modules'}));
		await user.click(screen.getByRole('checkbox', {name: 'Tiles'}));

		fireEvent.keyDown(screen.getByRole('dialog', {name: 'Blueprint Editor'}), {key: 'Escape'});
		const firstConfirmation = screen.getByRole('alertdialog', {name: 'Confirmation'});
		await waitFor(() => {
			expect({
				buttons: within(firstConfirmation)
					.getAllByRole('button')
					.map((button) => button.textContent),
				dialogState: interactionState(),
				navigation: navigate.mock.calls,
			}).toStrictEqual({
				buttons: ['Cancel', 'Discard changes'],
				dialogState: {
					activeElement: {name: 'Cancel', tagName: 'BUTTON'},
					dialogStack: [
						{
							ariaHidden: 'true',
							inert: true,
							modal: 'true',
							name: 'Blueprint Editor',
							role: 'dialog',
						},
						{
							ariaHidden: null,
							inert: false,
							modal: 'true',
							name: 'Confirmation',
							role: 'alertdialog',
						},
					],
				},
				navigation: [],
			});
		});

		await user.click(within(firstConfirmation).getByRole('button', {name: 'Cancel'}));
		await Promise.resolve();
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			dialogState: interactionState(),
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			title: screen.getByText('Bob', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			description: 'Draft description',
			dialogState: {
				activeElement: {name: 'Tiles', tagName: 'INPUT'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Blueprint Editor',
						role: 'dialog',
					},
				],
			},
			filters: [false, true, true, false],
			icon: 'Signal red\nvirtual:signal-red',
			title: 'Bob',
		});

		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));
		const secondConfirmation = screen.getByRole('alertdialog', {name: 'Confirmation'});
		await user.click(within(secondConfirmation).getByRole('button', {name: 'Discard changes'}));
		await Promise.resolve();
		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [],
		});

		await user.click(editorTool);
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
			title: screen.getByText('Alice', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			description: 'Source description',
			filters: [true, true, true, true],
			icon: 'Signal green\nvirtual:signal-green',
			saveDisabled: true,
			title: 'Alice',
		});
	});

	test('saves Blueprint parametrisation edits and preserves unsupported parameter rows', async () => {
		const user = userEvent.setup();
		const parameterizedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				parameters: [
					{
						type: 'id',
						name: 'Plate',
						id: 'iron-plate',
						'quality-condition': {quality: 'normal', comparator: '='},
					},
					{
						type: 'number',
						name: 'Count',
						number: '10',
						variable: 'N',
						dependent: true,
						formula: 'N + 2',
					},
				],
			},
		};
		render(<TransformPanel blueprint={parameterizedBlueprint} />);

		openBlueprintEditor();
		const editor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		const parameterButton = screen.getByRole('button', {name: 'Parametrise or reconfigure the blueprint'});
		await user.click(parameterButton);
		const parameterDialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
		const addParameter = screen.getByRole('button', {name: 'Add parameter'});
		const parameterName = screen.getByRole('textbox', {name: 'Parameter 1 name'});
		expect({
			activeElement: document.activeElement,
			editorAriaHidden: editor.getAttribute('aria-hidden'),
			editorInert: editor.inert,
			expanded: parameterButton.getAttribute('aria-expanded'),
			parameterDialogId: parameterDialog.id,
		}).toStrictEqual({
			activeElement: addParameter,
			editorAriaHidden: 'true',
			editorInert: true,
			expanded: 'true',
			parameterDialogId: parameterButton.getAttribute('aria-controls'),
		});
		await user.clear(parameterName);
		await user.type(parameterName, 'Any plate');
		await user.click(screen.getByRole('button', {name: 'Confirm'}));
		await waitFor(() => {
			expect(document.activeElement).toBe(parameterButton);
		});
		expect({
			editorAriaHidden: editor.getAttribute('aria-hidden'),
			editorInert: editor.inert,
			expanded: parameterButton.getAttribute('aria-expanded'),
		}).toStrictEqual({
			editorAriaHidden: null,
			editorInert: false,
			expanded: 'false',
		});
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						parameters: [
							{
								type: 'id',
								id: 'iron-plate',
								'quality-condition': {quality: 'normal', comparator: '='},
								name: 'Any plate',
							},
							{
								type: 'number',
								name: 'Count',
								number: '10',
								variable: 'N',
								dependent: true,
								formula: 'N + 2',
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('removes and restores blueprint components within the editor draft', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const activeComponent = screen.getByRole('button', {name: /Transport belt, 1/});
		const contextMenuAllowed = fireEvent.contextMenu(activeComponent);
		const removedComponent = screen.getByRole('button', {name: /Transport belt, removed/});
		expect({
			contextMenuAllowed,
			count: removedComponent.querySelector('.blueprint-components__count')?.textContent,
			navigation: navigate.mock.calls,
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
		}).toStrictEqual({
			contextMenuAllowed: false,
			count: '0',
			navigation: [],
			saveDisabled: false,
		});

		await user.click(removedComponent);
		const restoredComponent = screen.getByRole('button', {name: /Transport belt, 1/});
		expect({
			count: restoredComponent.querySelector('.blueprint-components__count')?.textContent,
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
		}).toStrictEqual({
			count: '1',
			saveDisabled: true,
		});

		fireEvent.keyDown(restoredComponent, {key: 'Delete'});
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [],
					},
				}),
				selection: '',
			},
		});
	});

	test('requires an explicit icon source and clears an incomplete mapping', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
			},
		};
		render(<TransformPanel blueprint={iconBlueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		const sourceSlot = screen.getByRole('button', {name: 'Choose source icon'});
		const targetSlot = screen.getByRole('button', {name: 'Choose target icon'});
		expect({
			clearButton: screen.queryByRole('button', {name: /Clear source/}),
			sourceImage: sourceSlot.querySelector('img'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({clearButton: null, sourceImage: null, targetDisabled: 'false'});

		await user.click(sourceSlot);
		await chooseSignal(user, 'Signal red');
		expect({
			clearButtonLabel: screen.getByRole('button', {name: 'Dismiss new replacement'}).getAttribute('aria-label'),
			sourceImage: sourceSlot.querySelector('img')?.getAttribute('src'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({
			clearButtonLabel: 'Dismiss new replacement',
			sourceImage: 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-red.webp',
			targetDisabled: 'false',
		});

		await user.click(screen.getByRole('button', {name: 'Dismiss new replacement'}));
		expect({
			clearButton: screen.queryByRole('button', {name: /Clear source/}),
			sourceImage: sourceSlot.querySelector('img'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({clearButton: null, sourceImage: null, targetDisabled: 'false'});
	});

	test('applies book operations to the live result', async () => {
		const user = userEvent.setup();
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 20,
				active_index: 10,
				blueprints: [
					{index: 10, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
					{index: 20, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
				],
			},
		};
		render(<TransformPanel blueprint={book} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('checkbox', {name: 'Sort entries by label'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint_book: {
						item: 'blueprint-book',
						version: 20,
						active_index: 0,
						blueprints: [
							{index: 0, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
							{index: 1, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('commits local label-icon edits in exact slot order', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Red starter',
				description: 'Old description',
				version: 0,
				icons: [
					{index: 2, signal: {type: 'virtual', name: 'signal-green'}},
					{index: 3, signal: {type: 'virtual', name: 'signal-blue'}},
					{index: 1, signal: {type: 'virtual', name: 'signal-red'}},
				],
			},
		};
		render(<TransformPanel blueprint={iconBlueprint} />);

		await user.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Blue starter{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'New description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await searchSignals(user, 'yellow');
		await chooseSignal(user, 'Signal yellow');
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Edit icon 2'}));
		await user.click(screen.getByRole('button', {name: 'Edit icon 3'}));
		await searchSignals(user, 'green');
		await chooseSignal(user, 'Signal green');
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint: {
									item: 'blueprint',
									version: 0,
									description: 'New description',
									icons: [
										{index: 1, signal: {type: 'virtual', name: 'signal-yellow', quality: 'rare'}},
										{index: 3, signal: {type: 'virtual', name: 'signal-green'}},
									],
									label: 'Blue starter',
								},
							}),
							selection: '',
						},
					},
				],
			],
		});
	});

	test('saves grid metadata without changing blueprint entities', async () => {
		const user = userEvent.setup();
		const gridBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				'snap-to-grid': {x: 32, y: 64},
				'absolute-snapping': true,
				'position-relative-to-grid': {x: 0, y: -16},
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={gridBlueprint} />);

		openBlueprintEditor();
		fireEvent.change(screen.getByRole('spinbutton', {name: 'Width'}), {target: {value: '16'}});
		await user.click(screen.getByRole('radio', {name: 'Relative'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
						'snap-to-grid': {x: 16, y: 64},
						'absolute-snapping': false,
					},
				}),
				selection: '',
			},
		});
	});

	test('commits a label icon on the click itself, with no Confirm button to reach for', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} rootBlueprint={blueprint} selectedPath="" />);

		await user.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await user.click(screen.getByRole('tab', {name: 'Signals'}));
		await user.click(screen.getByRole('button', {name: 'Choose Signal red'}));

		expect({
			confirm: screen.queryByRole('button', {name: 'Confirm'}),
			picker: screen.queryByRole('dialog', {name: 'Choose label icon 1'}),
		}).toStrictEqual({confirm: null, picker: null});
	});

	test('commits a nested-book child through the dirty-close confirmation', async () => {
		const user = userEvent.setup();
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's test book",
				version: 0,
				blueprints: [
					{index: 100, blueprint: {item: 'blueprint', label: 'Old label', version: 0}},
					{
						index: 200,
						blueprint: {
							item: 'blueprint',
							label: 'Unchanged',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
				],
			},
		};
		const selectedBlueprint = rootBlueprint.blueprint_book?.blueprints[0];
		const savedRoot: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's test book",
				version: 0,
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
							label: 'New label',
						},
					},
					{
						index: 200,
						blueprint: {
							item: 'blueprint',
							label: 'Unchanged',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
				],
			},
		};
		const {rerender} = render(
			<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />,
		);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'New label{Enter}');
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await searchSignals(user, 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));

		await waitFor(() => {
			expect({
				dialogState: interactionState(),
				navigation: navigate.mock.calls,
			}).toStrictEqual({
				dialogState: {
					activeElement: {name: 'Cancel', tagName: 'BUTTON'},
					dialogStack: [
						{
							ariaHidden: 'true',
							inert: true,
							modal: 'true',
							name: 'Blueprint Editor',
							role: 'dialog',
						},
						{
							ariaHidden: null,
							inert: false,
							modal: 'true',
							name: 'Confirmation',
							role: 'alertdialog',
						},
					],
				},
				navigation: [],
			});
		});

		await user.click(screen.getByRole('button', {name: 'Cancel'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint(savedRoot),
							selection: '1',
						},
					},
				],
			],
		});

		const savedBlueprint = savedRoot.blueprint_book?.blueprints[0];
		rerender(<TransformPanel blueprint={savedBlueprint} rootBlueprint={savedRoot} selectedPath="1" />);
		openBlueprintEditor();
		expect({
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
			title: screen.getByText('New label', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			icon: 'Signal red\nvirtual:signal-red',
			saveDisabled: true,
			title: 'New label',
		});
	});

	test('numbers label-icon picker titles by slot position', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
			},
		};
		render(<TransformPanel blueprint={iconBlueprint} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Choose icon 2'}));
		expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(
			screen.getByRole('heading', {name: 'Choose label icon 2'}).id,
		);

		fireEvent.keyDown(window, {code: 'Escape', key: 'Escape'});
		await user.click(screen.getByRole('button', {name: 'Choose icon 3'}));
		expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(
			screen.getByRole('heading', {name: 'Choose label icon 3'}).id,
		);
	});

	test('dismisses icon pickers with Escape or Q without stealing Q from search', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const blueprintEditor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Dirty picker priority{Enter}');
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await searchSignals(user, 'q');
		const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
		expect({
			blueprintEditorAriaHidden: blueprintEditor.getAttribute('aria-hidden'),
			blueprintEditorInert: blueprintEditor.inert,
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			search: search.value,
		}).toStrictEqual({
			blueprintEditorAriaHidden: 'true',
			blueprintEditorInert: true,
			picker: 'true',
			search: 'q',
		});

		fireEvent.keyDown(search, {key: 'Escape', code: 'Escape'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.queryByRole('dialog', {name: 'Choose label icon 1'}),
		}).toStrictEqual({blueprintEditor: 'true', picker: null});

		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		fireEvent.keyDown(window, {key: 'q', code: 'KeyQ'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.queryByRole('dialog', {name: 'Choose label icon 1'}),
		}).toStrictEqual({blueprintEditor: 'true', picker: null});

		fireEvent.keyDown(window, {key: 'Escape', code: 'Escape'});
		expect({
			confirmation: screen.getByRole('alertdialog', {name: 'Confirmation'}).getAttribute('aria-modal'),
			editorHidden: blueprintEditor.getAttribute('aria-hidden'),
			title: screen.getByText('Dirty picker priority', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			confirmation: 'true',
			editorHidden: 'true',
			title: 'Dirty picker priority',
		});
	});
});
