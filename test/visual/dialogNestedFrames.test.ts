import {describe, expect, it} from 'vite-plus/test';

import {dialogSamplesHtml} from './dialogSamples';
import {type NestedFrameBevel, inspectNestedFrameBevels} from './setup';

// The game's `frame` face is raised, and it never nests one raised face inside
// another: the frames a dialog holds -- `inside_shallow_frame` and the
// `entity_frame` built on it -- are carved into the dialog. Repeating the raised
// bevel on them stacked a second raised edge 8px inside the dialog's own, which
// reads as a doubled border, so a nested frame carries the sunken edge instead.
const insideBevel =
	'rgb(29, 29, 29) 1px 1px 0px 0px inset, rgb(35, 35, 35) 2px 2px 0px 0px inset, ' +
	'rgb(105, 105, 105) -1px -1px 0px 0px inset, rgb(99, 99, 99) -2px -2px 0px 0px inset';

const expectedNestedFrames: NestedFrameBevel[] = [
	{bevel: insideBevel, sample: 'planner-selector[1]'},
	{bevel: insideBevel, sample: 'planner-metadata[1]'},
];

describe('Nested dialog frames', () => {
	it('sinks every frame nested directly inside a dialog frame', async () => {
		const nestedFrames = await inspectNestedFrameBevels('dialog-nested-frames', dialogSamplesHtml);

		expect(nestedFrames).toStrictEqual(nestedFrames === undefined ? undefined : expectedNestedFrames);
	});
});
