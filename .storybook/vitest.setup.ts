import {beforeAll} from 'vitest';
import {setProjectAnnotations} from '@storybook/react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as globalStorybookConfig from './preview';

if (typeof window !== 'undefined') {
	window.React = React;
	window.ReactDOM = ReactDOM;
	globalThis.React = React;
	globalThis.ReactDOM = ReactDOM;
}

const annotations = setProjectAnnotations([globalStorybookConfig]);

beforeAll(async () => {
	if (annotations.beforeAll) {
		await annotations.beforeAll();
	}
});
