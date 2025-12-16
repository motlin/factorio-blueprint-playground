import type {Preview} from '@storybook/react-vite';

import '../src/styles/main.css';
import '../src/styles/factorio-a76ef767.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			default: 'factorio-dark',
			values: [
				{name: 'factorio-dark', value: '#313031'},
				{name: 'light', value: '#ffffff'},
				{name: 'dark', value: '#1a1a1a'},
			],
		},
	},
};

export default preview;
