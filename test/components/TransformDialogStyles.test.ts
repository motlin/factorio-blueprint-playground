/// <reference types="node" />

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {expect, test} from 'vite-plus/test';

import gameUiSpec from '../../src/generated/game-ui-spec.json';

const stylesheet = readFileSync(resolve('src/styles/main.css'), 'utf8');

function ruleFor(selector: string): string {
	const start = stylesheet.indexOf(`${selector} {`);
	if (start < 0) {
		throw new Error(`Missing CSS selector: ${selector}`);
	}
	const end = stylesheet.indexOf('}', start);
	return stylesheet.slice(start, end + 1);
}

function propertyFor(selector: string, property: string): string {
	const match = ruleFor(selector).match(new RegExp(`\\n\\t${property}:\\s+([^;]+);`));
	if (match === null) {
		throw new Error(`Missing ${property} property for CSS selector: ${selector}`);
	}
	return match[1].replaceAll(/\s+/gu, ' ');
}

test('keeps the signal picker wide enough to cover the Blueprint Editor shell', () => {
	expect({
		blueprintDialogWidth: propertyFor('.transform-dialog.transform-workbench--blueprint', 'width'),
		blueprintWorkbenchWidth: propertyFor('.transform-workbench--blueprint', 'width'),
		pickerWidth: propertyFor('.transform-dialog--picker', 'width'),
	}).toStrictEqual({
		blueprintDialogWidth: 'min(var(--blueprint-editor-dialog-width), 100%)',
		blueprintWorkbenchWidth: 'min(var(--blueprint-editor-dialog-width), 100%)',
		pickerWidth: 'min(var(--blueprint-editor-dialog-width), 100%)',
	});
});

test('stretches the Blueprint Editor title stripe across the available title-bar width', () => {
	expect({
		titleFlex: propertyFor('.transform-workbench__title', 'flex'),
		titleContentFlex: propertyFor('.transform-workbench__title > div', 'flex'),
	}).toStrictEqual({
		titleFlex: '1 1 auto',
		titleContentFlex: '1 1 auto',
	});
});

test('insets the Blueprint Editor footer actions from the dialog edges', () => {
	expect(propertyFor('.blueprint-editor-actions', 'padding')).toBe('8px');
});

test('uses dark Factorio textboxes for descriptions and text replacements', () => {
	const textboxSelector = ".blueprint-description-editor textarea,\n.text-replacement-editor input[type='text']";
	const focusedTextboxSelector =
		".blueprint-description-editor textarea:focus,\n.text-replacement-editor input[type='text']:focus";

	expect({
		background: propertyFor(textboxSelector, 'background'),
		border: propertyFor(textboxSelector, 'border'),
		color: propertyFor(textboxSelector, 'color'),
		focusBackground: propertyFor(focusedTextboxSelector, 'background'),
		focusOutline: propertyFor(focusedTextboxSelector, 'outline'),
	}).toStrictEqual({
		background: 'var(--factorio-ui-dark)',
		border: '1px solid var(--factorio-ui-border)',
		color: 'var(--factorio-ui-text)',
		focusBackground: 'var(--factorio-ui-dark)',
		focusOutline: '2px solid var(--factorio-ui-accent)',
	});
});

test('uses dark Factorio scrollbars throughout the Blueprint Editor', () => {
	const scrollbarSelector = '.factorio-scroll-frame,\n.blueprint-editor__settings-scroll';
	const scrollbarThumbSelector =
		'.factorio-scroll-frame::-webkit-scrollbar-thumb,\n.blueprint-editor__settings-scroll::-webkit-scrollbar-thumb';
	const scrollbarTrackSelector =
		'.factorio-scroll-frame::-webkit-scrollbar-track,\n.blueprint-editor__settings-scroll::-webkit-scrollbar-track';

	expect({
		color: propertyFor(scrollbarSelector, 'scrollbar-color'),
		thumbBackground: propertyFor(scrollbarThumbSelector, 'background'),
		trackBackground: propertyFor(scrollbarTrackSelector, 'background'),
		width: propertyFor(scrollbarSelector, 'scrollbar-width'),
	}).toStrictEqual({
		color: '#6f6d6f #242324',
		thumbBackground: '#6f6d6f',
		trackBackground: '#242324',
		width: 'auto',
	});
});

test('styles empty Blueprint parameter copy without an inset editable field', () => {
	expect({
		background: propertyFor('.blueprint-parameterization__empty-state', 'background'),
		boxShadow: propertyFor('.blueprint-parameterization__empty-state', 'box-shadow'),
		padding: propertyFor('.blueprint-parameterization__empty-state', 'padding'),
	}).toStrictEqual({
		background: 'transparent',
		boxShadow: 'none',
		padding: 'calc(8px * var(--factorio-ui-density)) calc(10px * var(--factorio-ui-density))',
	});
});

test('keeps the Blueprint parameterization shell free of one-sided frame highlights', () => {
	expect(propertyFor('.transform-dialog.blueprint-parameterization', 'box-shadow')).toBe('none');
});

test('keeps the snap-to-grid checkmark inside its checkbox', () => {
	const selector = '.blueprint-snap-grid-editor__master input::after';

	expect({
		height: propertyFor(selector, 'height'),
		left: propertyFor(selector, 'left'),
		top: propertyFor(selector, 'top'),
		transform: propertyFor(selector, 'transform'),
		width: propertyFor(selector, 'width'),
	}).toStrictEqual({
		height: '12px',
		left: '9px',
		top: '4px',
		transform: 'rotate(45deg)',
		width: '6px',
	});
});

test('paints disallowed signal picker slots with the resting red_slot_button graphical set', () => {
	const disallowedSelector = ".transform-picker__option[aria-disabled='true']";
	const removedSelector = '.blueprint-components__slot--removed .blueprint-components__slot-button';

	expect({
		disallowedBackground: propertyFor(disallowedSelector, 'background'),
		disallowedBoxShadow: propertyFor(disallowedSelector, 'box-shadow'),
		removedBackground: propertyFor(removedSelector, 'background'),
		removedBoxShadow: propertyFor(removedSelector, 'box-shadow'),
	}).toStrictEqual({
		disallowedBackground: '#733636',
		disallowedBoxShadow: 'inset 1px 1px 0 #a85858, inset -2px -2px 0 #321616',
		removedBackground: '#733636',
		removedBoxShadow: 'inset 1px 1px 0 #a85858, inset -2px -2px 0 #321616',
	});
});

test('keeps hovered and pressed disallowed signal picker slots red instead of flipping them to the orange slot', () => {
	const hoveredSelector =
		".transform-picker__option[aria-disabled='true']:hover,\n.transform-picker__option[aria-disabled='true'][data-visual-state='hover']";
	const activeSelector = ".transform-picker__option[aria-disabled='true']:active";

	expect({
		activeBackground: propertyFor(activeSelector, 'background'),
		hoveredBackground: propertyFor(hoveredSelector, 'background'),
	}).toStrictEqual({
		activeBackground: '#7e2b2b',
		hoveredBackground: '#a84c4c',
	});
});

test('reflows the mapper table at exactly the source-derived four-pair width', () => {
	const sourceTableWidth =
		gameUiSpec.styles.mappingPairWidth * gameUiSpec.upgradePlanner.mappingsPerRow +
		gameUiSpec.styles.mappingTableHorizontalSpacing.reduce((total, spacing) => total + spacing, 0);

	expect(stylesheet).toContain(`@container upgrade-mapping (width < ${sourceTableWidth.toString()}px) {`);
	expect(propertyFor('.upgrade-mapping-grid', 'container')).toBe('upgrade-mapping / inline-size');
	expect(propertyFor('.upgrade-mapping-grid', 'max-width')).toBe(
		'calc(var(--upgrade-mapping-table-width) * var(--factorio-ui-density))',
	);
});
