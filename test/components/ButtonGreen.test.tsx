import {fireEvent, render} from '@testing-library/react';
import type React from 'react';
import {describe, expect, it, vi} from 'vite-plus/test';

import {ButtonGreen} from '../../src/components/ui/ButtonGreen';
import '../../test/setup';

/**
 * Test suite for ButtonGreen component.
 * Verifies button rendering, click handling, disabled states, and icon integration.
 */
describe('ButtonGreen Component', () => {
	// Test basic rendering and structure
	it('renders with correct base styles', () => {
		const {container} = render(<ButtonGreen onClick={() => undefined}>Test Button</ButtonGreen>);

		const button = container.firstChild as HTMLButtonElement;
		expect({
			alignItems: button.style.alignItems,
			className: button.className,
			display: button.style.display,
			tagName: button.tagName,
			textContent: button.textContent,
			type: button.type,
		}).toStrictEqual({
			alignItems: 'center',
			className: 'button-green-right ',
			display: 'inline-flex',
			tagName: 'BUTTON',
			textContent: 'Test Button',
			type: 'button',
		});
	});

	// Test click handler functionality
	it('calls onClick handler when clicked', () => {
		const handleClick = vi.fn<(e: React.MouseEvent<HTMLButtonElement>) => void>();
		const {container} = render(<ButtonGreen onClick={handleClick}>Clickable Button</ButtonGreen>);

		const button = container.firstChild as HTMLButtonElement;
		fireEvent.click(button);
		expect(handleClick).toHaveBeenCalledTimes(1);

		// Verify event object is passed to handler
		const mockEvent = expect.anything() as React.MouseEvent<HTMLButtonElement>;
		expect(handleClick).toHaveBeenCalledWith(mockEvent);
	});

	// Test children rendering
	it('renders children correctly', () => {
		const {getByText, container} = render(
			<ButtonGreen onClick={() => undefined}>
				<span>Button Text</span>
				<div>Extra Content</div>
			</ButtonGreen>,
		);

		expect(getByText('Button Text')).toBeInTheDocument();
		expect(getByText('Extra Content')).toBeInTheDocument();
		expect(container.firstChild?.childNodes).toHaveLength(2);
	});
});
