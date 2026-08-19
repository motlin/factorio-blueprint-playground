export const transformStoryParameters = {
	layout: 'fullscreen',
	chromatic: {
		viewports: [320, 768, 1200],
	},
	viewport: {
		defaultViewport: 'transform-desktop',
		options: {
			'transform-desktop': {
				name: 'Desktop',
				styles: {height: '800px', width: '1200px'},
				type: 'desktop',
			},
			'transform-narrow': {
				name: 'Narrow',
				styles: {height: '640px', width: '320px'},
				type: 'mobile',
			},
			'transform-short': {
				name: 'Short',
				styles: {height: '360px', width: '960px'},
				type: 'desktop',
			},
		},
	},
} as const;
