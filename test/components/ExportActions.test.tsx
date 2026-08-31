import {render} from '@testing-library/react';
import {describe, expect, it} from 'vite-plus/test';

import {ExportActions} from '../../src/components/blueprint/export/ExportActions';
import {
	FACTORIO_BLUEPRINT_EDITOR_URL,
	FACTORIOPRINTS_BLUEPRINT_DATA_URL,
	MAX_EDITOR_URL_LENGTH,
} from '../../src/lib/factorioBlueprintEditor';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import '../setup';

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 562949954076673,
		label: 'Iron Smelting',
	},
};

function getEditorLink(container: HTMLElement): HTMLAnchorElement | null {
	return container.querySelector<HTMLAnchorElement>(`a[href^="${FACTORIO_BLUEPRINT_EDITOR_URL}"]`);
}

/** A blueprint whose label is incompressible enough to blow past the url limit. */
function makeOversizedBlueprint(): BlueprintString {
	// Deterministic LCG: compressible input would shrink back under the limit.
	let seed = 1;
	const label = Array.from({length: MAX_EDITOR_URL_LENGTH * 2}, () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return String.fromCharCode(33 + (seed % 94));
	}).join('');

	return {
		blueprint: {
			item: 'blueprint',
			version: 562949954076673,
			label,
		},
	};
}

describe('ExportActions editor link', () => {
	it('links the blueprint string to the Factorio Blueprint Editor', () => {
		const {container, getByText} = render(<ExportActions blueprint={blueprint} title="Root Blueprint" />);

		const link = getEditorLink(container);
		expect(link).not.toBeNull();
		expect(getByText('Open in Editor')).toBeInTheDocument();

		const source = new URL(link?.href ?? '').searchParams.get('source');
		expect(source).toBe(serializeBlueprint(blueprint));
	});

	it('opens the editor in a new tab without leaking the referrer opener', () => {
		const {container} = render(<ExportActions blueprint={blueprint} title="Root Blueprint" />);

		const link = getEditorLink(container);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link?.rel).toContain('noopener');
		expect(link?.rel).toContain('noreferrer');
	});

	it('falls back to the source url when the blueprint is too large to put in a url', () => {
		const bigBlueprint = makeOversizedBlueprint();
		const sourceUrl = 'https://factorioprints.com/view/-KnQ865j-qQ21WoUPbd3';

		const {container} = render(
			<ExportActions blueprint={bigBlueprint} title="Root Blueprint" sourceUrl={sourceUrl} />,
		);

		const link = getEditorLink(container);
		expect(new URL(link?.href ?? '').searchParams.get('source')).toBe(sourceUrl);
	});

	it('omits the link when the blueprint cannot be expressed as a url', () => {
		const bigBlueprint = makeOversizedBlueprint();

		const {container, queryByText} = render(<ExportActions blueprint={bigBlueprint} title="Root Blueprint" />);

		expect(getEditorLink(container)).toBeNull();
		expect(queryByText('Open in Editor')).not.toBeInTheDocument();
	});
});

describe('ExportActions api source', () => {
	const apiSourceUrl = `${FACTORIOPRINTS_BLUEPRINT_DATA_URL}/fb7b59ab6efb271f4345315b537104b428b54857/position/1.0`;

	it('links the api url in place of the blueprint string', () => {
		const {container} = render(
			<ExportActions blueprint={blueprint} title="Selected Blueprint" apiSourceUrl={apiSourceUrl} />,
		);

		const link = getEditorLink(container);
		expect(new URL(link?.href ?? '').searchParams.get('source')).toBe(apiSourceUrl);
	});

	it('still links an oversized blueprint when the api can address it', () => {
		const {container} = render(
			<ExportActions blueprint={makeOversizedBlueprint()} title="Root Blueprint" apiSourceUrl={apiSourceUrl} />,
		);

		const link = getEditorLink(container);
		expect(new URL(link?.href ?? '').searchParams.get('source')).toBe(apiSourceUrl);
	});
});

describe('ExportActions labelling', () => {
	it('names the blueprint once, in the panel heading', () => {
		const {getAllByText, queryByText} = render(<ExportActions blueprint={blueprint} title="Root Blueprint" />);

		expect(getAllByText('Root Blueprint')).toHaveLength(1);
		// "Export Root Blueprint" over a repeated "Root Blueprint" said it twice.
		expect(queryByText(/Export/)).not.toBeInTheDocument();
	});
});
