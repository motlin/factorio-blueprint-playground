import {describe, expect, it} from 'vite-plus/test';

import {inspectPixelSnapping, type PixelSnappingLayout} from './setup';

const pageHtml = `
	<div class="top-bar">
		<div class="top-bar-inner">
			<nav class="site-navigation"><a class="blue nowrap">Blueprint Playground</a></nav>
		</div>
	</div>
	<div class="container mt12">
		<div class="factorio-frame"><p>Panel body</p></div>
	</div>
	<div class="container">
		<div class="blueprint-library"><p>Library</p></div>
	</div>
	<div class="factorio-dialog-backdrop">
		<div class="factorio-dialog"><p>Dialog</p></div>
	</div>
`;

describe('Whole-pixel layout', () => {
	// A classic page scrollbar leaves an odd number of layout pixels around the
	// centred 1200px shell, which is what an odd viewport width reproduces here.
	it('keeps centred layout on whole pixels when the layout width is odd', async () => {
		const layout = await inspectPixelSnapping('pixel-snapping-odd', pageHtml, {height: 900, width: 1665});
		const expectedLayout: PixelSnappingLayout = {
			backdropChildSnapped: true,
			containerSnapped: true,
			frameSnapped: true,
			layoutWidthIsOdd: true,
			librarySnapped: true,
			topBarInnerSnapped: true,
		};

		expect(layout).toStrictEqual(layout === undefined ? undefined : expectedLayout);
	});

	it('keeps centred layout on whole pixels when the layout width is even', async () => {
		const layout = await inspectPixelSnapping('pixel-snapping-even', pageHtml, {height: 900, width: 1666});
		const expectedLayout: PixelSnappingLayout = {
			backdropChildSnapped: true,
			containerSnapped: true,
			frameSnapped: true,
			layoutWidthIsOdd: false,
			librarySnapped: true,
			topBarInnerSnapped: true,
		};

		expect(layout).toStrictEqual(layout === undefined ? undefined : expectedLayout);
	});
});
