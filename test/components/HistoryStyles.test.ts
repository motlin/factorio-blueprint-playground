/// <reference types="node" />

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {expect, test} from 'vite-plus/test';

const stylesheet = readFileSync(resolve('src/styles/main.css'), 'utf8');

function propertyFor(selector: string, property: string): string {
	const start = stylesheet.indexOf(`${selector} {`);
	if (start < 0) {
		throw new Error(`Missing CSS selector: ${selector}`);
	}
	const end = stylesheet.indexOf('}', start);
	const rule = stylesheet.slice(start, end + 1);
	const match = rule.match(new RegExp(`\\n\\t${property}:\\s*([^;]+);`));
	if (match === null) {
		throw new Error(`Missing ${property} property for CSS selector: ${selector}`);
	}
	return match[1].replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
}

test('keeps the history Actions column wide enough for the arrow button', () => {
	expect(propertyFor('.history-grid', 'grid-template-columns')).toBe(
		'auto auto auto minmax(120px, auto) minmax(250px, 1fr) auto minmax(160px, auto) minmax(160px, auto)',
	);
});
