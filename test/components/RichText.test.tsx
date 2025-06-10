import {render, within} from '@testing-library/react';
import React from 'react';
import {describe, expect, it} from 'vitest';

import {RichText} from '../../src/components/core/text/RichText';
import '../../test/setup';

describe('RichText', () => {
	// Test empty and null input
	it('handles empty input', () => {
		const {container} = render(<RichText text="" />);
		expect(container.firstChild).toBe(null);
	});

	it('handles null input', () => {
		// @ts-expect-error: Testing null input explicitly to verify component behavior
		const {container} = render(<RichText text={null} />);
		expect(container.firstChild).toBe(null);
	});

	// Test basic item tags
	it('renders item tags correctly', () => {
		const {getByTestId} = render(<RichText text="[item=blueprint-book]" />);
		const icon = getByTestId('icon');
		expect(icon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/item/blueprint-book.webp');
		expect(icon.getAttribute('title')).toBe('item: blueprint-book');
	});

	// Test quality parameter
	it('renders items with quality correctly', () => {
		const renderResult = render(<RichText text="[item=iron-plate,quality=normal]" />);

		const wrapper = renderResult.getByTestId('iconParent');
		expect(wrapper).toBeTruthy();

		const mainIcon = within(wrapper).getByTestId('icon');
		expect(mainIcon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/item/iron-plate.webp');

		const qualityIcon = within(wrapper).getByTestId('quality');
		expect(qualityIcon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/quality/normal.webp');
	});

	// Test entity tags with quality
	it('renders entities with quality correctly', () => {
		const renderResult = render(<RichText text="[entity=small-biter,quality=uncommon]" />);

		const wrapper = renderResult.getByTestId('iconParent');
		expect(wrapper).toBeTruthy();

		const mainIcon = within(wrapper).getByTestId('icon');
		expect(mainIcon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/entity/small-biter.webp');

		const qualityIcon = within(wrapper).getByTestId('quality');
		expect(qualityIcon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/quality/uncommon.webp');
	});

	// Test quality tags both as plain tags and as modifiers
	describe('quality tags', () => {
		it('renders plain quality tags correctly', () => {
			const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];
			const text = qualities.map((q) => `[quality=${q}]`).join('');

			const {getAllByTestId} = render(<RichText text={text} />);

			const icons = getAllByTestId('icon');
			expect(icons.length).toBe(qualities.length);

			qualities.forEach((quality, index) => {
				const icon = icons[index];
				expect(icon.getAttribute('src')).toBe(`https://factorio-icon-cdn.pages.dev/quality/${quality}.webp`);
			});
		});

		it('renders quality parameters on items correctly', () => {
			const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];
			const {getAllByTestId} = render(
				<RichText text={qualities.map((q) => `[item=iron-plate,quality=${q}]`).join('')} />,
			);

			const qualityIcons = getAllByTestId('quality');
			expect(qualityIcons.length).toBe(qualities.length);

			qualities.forEach((quality, index) => {
				const icon = qualityIcons[index];
				expect(icon.getAttribute('src')).toBe(`https://factorio-icon-cdn.pages.dev/quality/${quality}.webp`);
			});
		});
	});

	// Test planet tags
	it('renders planet tags correctly', () => {
		const {getByTestId} = render(<RichText text="[planet=gleba]" />);
		const icon = getByTestId('icon');
		expect(icon.getAttribute('src')).toBe('https://factorio-icon-cdn.pages.dev/space-location/gleba.webp');
	});

	// Test planet/space-location tags
	describe('space location tags', () => {
		it('renders space location tags correctly', () => {
			const {getAllByTestId} = render(
				<RichText text="[space-location=solar-system-edge] [space-location=shattered-planet]" />,
			);

			const icons = getAllByTestId('icon');
			expect(icons.length).toBe(2);

			// Check first icon
			const firstIcon = icons[0];
			expect(firstIcon.getAttribute('src')).toBe(
				'https://factorio-icon-cdn.pages.dev/space-location/solar-system-edge.webp',
			);
			expect(firstIcon.getAttribute('title')).toBe('space-location: solar-system-edge');

			// Check second icon
			const secondIcon = icons[1];
			expect(secondIcon.getAttribute('src')).toBe(
				'https://factorio-icon-cdn.pages.dev/space-location/shattered-planet.webp',
			);
			expect(secondIcon.getAttribute('title')).toBe('space-location: shattered-planet');
		});

		it('renders planet tags as space-location icons', () => {
			const {getByTestId} = render(<RichText text="[planet=solar-system-edge]" />);

			const icon = getByTestId('icon');
			expect(icon).toBeTruthy();
			expect(icon.getAttribute('src')).toBe(
				'https://factorio-icon-cdn.pages.dev/space-location/solar-system-edge.webp',
			);
			expect(icon.getAttribute('title')).toBe('planet: solar-system-edge');
		});
	});

	// Test virtual signal tags
	it('renders virtual signal tags correctly', () => {
		const {getByTestId} = render(<RichText text="[virtual-signal=signal-any-quality]" />);
		const icon = getByTestId('icon');
		expect(icon.getAttribute('src')).toBe(
			'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp',
		);
	});

	// Test color tags with different formats
	describe('color tags', () => {
		it('handles named colors', () => {
			const renderedResult = render(<RichText text="[color=red]Red text[/color]" />);
			const span = renderedResult.getByText('Red text');
			// #eb5c5f
			expect(span.style.color).toBe('rgb(235, 92, 95)');
			expect(span.textContent).toBe('Red text');
		});

		it('handles RGB values 0-1', () => {
			const renderedResult = render(<RichText text="[color=1,0,0]Red text[/color]" />);
			const span = renderedResult.getByText('Red text');
			expect(span.style.color).toBe('rgb(255, 0, 0)');
			expect(span.textContent).toBe('Red text');
		});

		it('handles RGB values 0-255', () => {
			const renderedResult = render(<RichText text="[color=255,0,0]Red text[/color]" />);
			const span = renderedResult.getByText('Red text');
			expect(span.style.color).toBe('rgb(255, 0, 0)');
			expect(span.textContent).toBe('Red text');
		});

		it('handles hex colors', () => {
			const renderedResult = render(<RichText text="[color=#ff0000]Red text[/color]" />);
			const span = renderedResult.getByText('Red text');
			expect(span.style.color).toBe('rgb(255, 0, 0)');
			expect(span.textContent).toBe('Red text');
		});
	});

	// Test font tags
	it('renders bold font correctly', () => {
		const renderedResult = render(<RichText text="[font=default-bold]Bold text[/font]" />);
		const span = renderedResult.getByText('Bold text');
		expect(span.style.fontWeight).toBe('bold');
		expect(span.textContent).toBe('Bold text');
	});

	// Test nested formatting
	it('handles nested formatting correctly', () => {
		const {getByTestId} = render(<RichText text="[color=red][font=default-bold]Bold red text[/font][/color]" />);
		const span = getByTestId('formatted-text');
		// #eb5c5f
		expect(span.style.color).toBe('rgb(235, 92, 95)');
		expect(span.style.fontWeight).toBe('bold');
		expect(span.textContent).toBe('Bold red text');
	});

	// Test complex mixed content
	it('handles mixed content correctly', () => {
		const complexText =
			'[item=iron-plate,quality=normal] Iron plate with [color=red]red[/color] text and [font=default-bold]bold[/font] styling';
		const renderedResult = render(<RichText text={complexText} />);

		// Check root structure
		const richTextDiv = within(renderedResult.container).getByTestId('richtext');
		expect(richTextDiv).toBeInTheDocument();

		// Check icon wrapper
		const wrapper = within(richTextDiv).getByTestId('iconParent');
		expect(wrapper).toBeInTheDocument();
		// Instead of checking exact class names, verify the wrapper has some classes
		expect(wrapper.className).not.toBe('');

		// Check main icon properties
		const mainIcon = within(wrapper).getByTestId('icon');
		expect(mainIcon).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/item/iron-plate.webp');
		expect(mainIcon).toHaveAttribute('title', 'item: iron-plate');
		expect(mainIcon).toHaveAttribute('alt', 'iron-plate');
		expect(mainIcon).toHaveAttribute('loading', 'lazy');
		// Verify icon has a class without checking exact name
		expect(mainIcon.className).not.toBe('');

		// Check quality icon properties
		const qualityIcon = within(wrapper).getByTestId('quality');
		expect(qualityIcon).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/quality/normal.webp');
		expect(qualityIcon).toHaveAttribute('title', 'Quality: normal');
		expect(qualityIcon).toHaveAttribute('alt', 'normal');
		expect(qualityIcon).toHaveAttribute('loading', 'lazy');
		// Verify quality icon has a class without checking exact name
		expect(qualityIcon.className).not.toBe('');

		// Check all formatted text spans
		const formattedSpans = within(richTextDiv).getAllByTestId('formatted-text');
		expect(formattedSpans).toHaveLength(5);

		// First span (plain text before red)
		expect(formattedSpans[0]).toHaveStyle({fontWeight: 'normal'});
		expect(formattedSpans[0].textContent).toBe(' Iron plate with ');

		// Second span (red text)
		expect(formattedSpans[1]).toHaveStyle({
			color: 'rgb(235, 92, 95)',
			fontWeight: 'normal',
		});
		expect(formattedSpans[1].textContent).toBe('red');

		// Third span (plain text between red and bold)
		expect(formattedSpans[2]).toHaveStyle({fontWeight: 'normal'});
		expect(formattedSpans[2].textContent).toBe(' text and ');

		// Fourth span (bold text)
		expect(formattedSpans[3]).toHaveStyle({fontWeight: 'bold'});
		expect(formattedSpans[3].textContent).toBe('bold');

		// Fifth span (plain text after bold)
		expect(formattedSpans[4]).toHaveStyle({fontWeight: 'normal'});
		expect(formattedSpans[4].textContent).toBe(' styling');

		// Verify the complete text content
		expect(richTextDiv.textContent.trim()).toBe('Iron plate with red text and bold styling');
	});

	// Test invalid/malformed tags
	it('handles invalid tags gracefully', () => {
		const {container} = render(<RichText text="[invalid]test[/invalid]" />);
		expect(container.textContent).toBe('[invalid]test[/invalid]');
	});

	// Test unclosed tags
	it('handles unclosed tags gracefully', () => {
		const renderedResult = render(<RichText text="[color=red]text without closing tag" />);
		const span = renderedResult.getByText('text without closing tag');
		// #eb5c5f
		expect(span.style.color).toBe('rgb(235, 92, 95)');
		expect(span.textContent).toBe('text without closing tag');
	});
});
