import {describe, expect, it} from 'vite-plus/test';

import {dialogSamplesHtml} from './dialogSamples';
import {type DialogFrameEdge, inspectDialogFrameEdges} from './setup';

// `.factorio-frame--shallow` paints the game's two-pixel raised face as an inset
// box-shadow on the dialog itself. A child laid out flush against the frame edge
// with its own opaque background paints over that shadow, which is why some
// dialogs used to show a raised edge and some showed a flat one. The bevel has to
// survive on all four edges of every dialog, whatever its children do.
const bevelOf = (sample: string): DialogFrameEdge => ({
	bottomInner: '#232323',
	bottomOuter: '#1d1d1d',
	leftInner: '#636363',
	leftOuter: '#696969',
	rightInner: '#232323',
	rightOuter: '#1d1d1d',
	sample,
	topInner: '#636363',
	topOuter: '#696969',
});

const expectedEdges: DialogFrameEdge[] = [
	bevelOf('blueprint-editor'),
	bevelOf('upgrade-planner'),
	bevelOf('picker'),
	bevelOf('parameterization'),
	bevelOf('planner-selector'),
	bevelOf('planner-metadata'),
	bevelOf('planner-confirmation'),
	bevelOf('editor-confirmation'),
	bevelOf('icon-replacements'),
];

describe('Dialog frame edges', () => {
	it('keeps the raised bevel visible on every edge of every dialog', async () => {
		const edges = await inspectDialogFrameEdges('dialog-frame-edges', dialogSamplesHtml);

		expect(edges).toStrictEqual(edges === undefined ? undefined : expectedEdges);
	});
});
