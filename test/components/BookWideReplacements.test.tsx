import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, test, vi} from 'vite-plus/test';

import {
	BookWideReplacements,
	type BookWideReplacementsProps,
} from '../../src/components/blueprint/panels/transform/BookWideReplacements';

function replacementProps(): BookWideReplacementsProps {
	return {
		iconMappingCount: 2,
		iconReplacementCount: 5,
		metadataFind: 'red',
		metadataReplace: 'blue',
		metadataReplacementCount: 3,
		onIconReplacementsOpen: vi.fn<() => void>(),
		onMetadataFindChange: vi.fn<(value: string) => void>(),
		onMetadataReplaceChange: vi.fn<(value: string) => void>(),
		onTextReplacementEnabledChange: vi.fn<(enabled: boolean) => void>(),
		textReplacementEnabled: true,
	};
}

describe('BookWideReplacements', () => {
	test('defines a website-only root-book section distinct from planner mappings', () => {
		render(<BookWideReplacements {...replacementProps()} />);

		const section = screen.getByRole('region', {name: 'Book-wide replacements'});
		const iconReplacementButton = within(section).getByRole('button', {name: /Icon replacements/});
		expect({
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			className: section.className,
			find: within(section).getByRole<HTMLInputElement>('textbox', {name: 'Find'}).value,
			iconSummary: iconReplacementButton.querySelector('.transform-operation__text small')?.textContent,
			liveResult: screen.queryByText('Live result'),
			replaceWith: within(section).getByRole<HTMLInputElement>('textbox', {name: 'Replace with'}).value,
			scope: section.querySelector('.book-wide-replacements__scope')?.textContent,
			textReplacement: within(section).getByRole<HTMLInputElement>('checkbox', {
				name: 'Text replacement 3',
			}).checked,
			websiteLabel: within(section).getByText('Website extension').textContent,
		}).toStrictEqual({
			changeIn: null,
			className: 'panel-hole transform-workflow__section book-wide-replacements',
			find: 'red',
			iconSummary: '2 mappings · 5 replacements',
			liveResult: null,
			replaceWith: 'blue',
			scope: 'Always applies to titles, descriptions, and label icons throughout the entire root book, regardless of the selected blueprint.',
			textReplacement: true,
			websiteLabel: 'Website extension',
		});
	});

	test('reports icon and text replacement edits through separate controls', () => {
		const props = replacementProps();
		render(<BookWideReplacements {...props} />);

		fireEvent.click(screen.getByRole('button', {name: /Icon replacements/}));
		fireEvent.click(screen.getByRole('checkbox', {name: 'Text replacement 3'}));
		fireEvent.change(screen.getByRole('textbox', {name: 'Find'}), {target: {value: 'old'}});
		fireEvent.change(screen.getByRole('textbox', {name: 'Replace with'}), {target: {value: 'new'}});

		expect({
			find: vi.mocked(props.onMetadataFindChange).mock.calls,
			icon: vi.mocked(props.onIconReplacementsOpen).mock.calls,
			replaceWith: vi.mocked(props.onMetadataReplaceChange).mock.calls,
			textEnabled: vi.mocked(props.onTextReplacementEnabledChange).mock.calls,
		}).toStrictEqual({
			find: [['old']],
			icon: [[]],
			replaceWith: [['new']],
			textEnabled: [[false]],
		});
	});
});
