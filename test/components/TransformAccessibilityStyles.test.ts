/// <reference types="node" />

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {expect, test} from 'vite-plus/test';

const stylesheet = readFileSync(resolve('src/styles/main.css'), 'utf8');

function ruleFor(selector: string): string {
	const start = stylesheet.indexOf(`${selector} {`);
	if (start < 0) {
		throw new Error(`Missing CSS selector: ${selector}`);
	}
	const end = stylesheet.indexOf('}', start);
	return stylesheet.slice(start, end + 1);
}

test('keeps transform labels selectable and native keyboard focus visibly outlined', () => {
	expect({
		checkboxFocus: ruleFor('.transform-dialog .checkbox-label input:focus-visible ~ .checkbox'),
		informationalText: ruleFor(
			'.transform-dialog,\n.transform-dialog :where(h3, h4, p, small, strong, span, label, legend)',
		),
		nativeControlFocus: ruleFor(
			'.transform-dialog input:focus-visible,\n.transform-dialog select:focus-visible,\n.transform-dialog textarea:focus-visible',
		),
	}).toStrictEqual({
		checkboxFocus: `.transform-dialog .checkbox-label input:focus-visible ~ .checkbox {
\toutline: 2px solid #ffe6c0;
\toutline-offset: 2px;
}`,
		informationalText: `.transform-dialog,
.transform-dialog :where(h3, h4, p, small, strong, span, label, legend) {
\t-webkit-user-select: text;
\t-moz-user-select: text;
\tuser-select: text;
}`,
		nativeControlFocus: `.transform-dialog input:focus-visible,
.transform-dialog select:focus-visible,
.transform-dialog textarea:focus-visible {
\toutline: 2px solid #e39827;
\toutline-offset: 1px;
}`,
	});
});
