import {describe, expect, it} from 'vite-plus/test';

import {dialogSamplesHtml} from './dialogSamples';
import {type DialogChildInset, inspectDialogChildInsets} from './setup';

// Every transform dialog is a `.transform-dialog` frame whose direct children are
// either full-bleed stripes (title bars, workbench bodies and footers) or content
// inset from the frame edge. The inset ones all sit on one scale: the game's
// 8px frame padding, published as `--transform-dialog-inset`.
const fullBleed = 0;
const inset = 8;

const expectedInsets: DialogChildInset[] = [
	{left: fullBleed, right: fullBleed, sample: 'blueprint-editor[0]'},
	{left: fullBleed, right: fullBleed, sample: 'blueprint-editor[1]'},
	{left: fullBleed, right: fullBleed, sample: 'blueprint-editor[2]'},
	{left: fullBleed, right: fullBleed, sample: 'upgrade-planner[0]'},
	{left: fullBleed, right: fullBleed, sample: 'upgrade-planner[1]'},
	{left: fullBleed, right: fullBleed, sample: 'upgrade-planner[2]'},
	{left: fullBleed, right: fullBleed, sample: 'upgrade-planner[3]'},
	{left: fullBleed, right: fullBleed, sample: 'picker[0]'},
	{left: inset, right: inset, sample: 'picker[1]'},
	{left: fullBleed, right: fullBleed, sample: 'picker[2]'},
	{left: fullBleed, right: fullBleed, sample: 'parameterization[0]'},
	{left: inset, right: inset, sample: 'parameterization[1]'},
	{left: fullBleed, right: fullBleed, sample: 'parameterization[2]'},
	{left: fullBleed, right: fullBleed, sample: 'planner-selector[0]'},
	{left: inset, right: inset, sample: 'planner-selector[1]'},
	{left: fullBleed, right: fullBleed, sample: 'planner-metadata[0]'},
	{left: inset, right: inset, sample: 'planner-metadata[1]'},
	{left: fullBleed, right: fullBleed, sample: 'planner-metadata[2]'},
	{left: fullBleed, right: fullBleed, sample: 'planner-confirmation[0]'},
	{left: inset, right: inset, sample: 'planner-confirmation[1]'},
	{left: inset, right: inset, sample: 'planner-confirmation[2]'},
	{left: fullBleed, right: fullBleed, sample: 'editor-confirmation[0]'},
	{left: inset, right: inset, sample: 'editor-confirmation[1]'},
	{left: inset, right: inset, sample: 'editor-confirmation[2]'},
	{left: fullBleed, right: fullBleed, sample: 'icon-replacements[0]'},
	{left: inset, right: inset, sample: 'icon-replacements[1]'},
	{left: inset, right: inset, sample: 'icon-replacements[2]'},
];

describe('Dialog child insets', () => {
	it('insets every dialog child on the single frame-padding scale', async () => {
		const insets = await inspectDialogChildInsets('dialog-child-insets', dialogSamplesHtml);

		expect(insets).toStrictEqual(insets === undefined ? undefined : expectedInsets);
	});
});
