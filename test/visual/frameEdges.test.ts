import {describe, expect, it} from 'vite-plus/test';

import {type FrameEdge, type FrameEdgeSurvey, inspectFrameEdges} from './setup';

// Panels, insets, dialogs, and scroll frames all carry .factorio-frame, and the
// page-level ones additionally carry the vendored sheet's .panel family. Both
// class families paint an edge, so this fixture pairs each vendored panel class
// with the frame-only element that shares its depth.
const frameHtml = `
	<div class="container mt12">
		<div class="factorio-frame factorio-frame--shallow panel" data-frame-sample="shallow-panel">
			<p>Panel body</p>
		</div>
		<div class="factorio-frame factorio-frame--deep panel-inset" data-frame-sample="deep-inset-dark">
			<p>Dark inset</p>
		</div>
		<div class="factorio-frame factorio-frame--deep panel-inset-lighter" data-frame-sample="deep-inset-light">
			<p>Light inset</p>
		</div>
		<div class="factorio-frame factorio-frame--deep factorio-scroll-frame" data-frame-sample="deep-scroll-frame">
			<p>Scroll frame</p>
		</div>
	</div>
	<div class="factorio-dialog-backdrop">
		<section class="factorio-frame factorio-frame--shallow factorio-dialog" data-frame-sample="shallow-dialog">
			<p>Dialog body</p>
		</section>
	</div>
`;

const raisedBevel: FrameEdge = {
	borderImageSource: 'none',
	borderStyle: 'none',
	borderWidth: '0px',
	boxShadow:
		'rgb(105, 105, 105) 1px 1px 0px 0px inset, rgb(99, 99, 99) 2px 2px 0px 0px inset, ' +
		'rgb(29, 29, 29) -1px -1px 0px 0px inset, rgb(35, 35, 35) -2px -2px 0px 0px inset',
};

const sunkenBevel: FrameEdge = {
	borderImageSource: 'none',
	borderStyle: 'none',
	borderWidth: '0px',
	boxShadow: 'rgb(17, 17, 17) 0px 2px 4px 0px inset, rgb(104, 104, 104) 0px -1px 1px 0px inset',
};

describe('Frame edges', () => {
	it('paints one bevel per depth, whichever vendored panel class an element also carries', async () => {
		const survey = await inspectFrameEdges('frame-edges', frameHtml);
		const expectedSurvey: FrameEdgeSurvey = {
			deepInsetDark: sunkenBevel,
			deepInsetLight: sunkenBevel,
			deepScrollFrame: sunkenBevel,
			shallowDialog: raisedBevel,
			shallowPanel: raisedBevel,
		};

		expect(survey).toStrictEqual(survey === undefined ? undefined : expectedSurvey);
	});
});
