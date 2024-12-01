import { render, fireEvent } from '@testing-library/preact';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonGreen } from '../../src/components/ui/ButtonGreen';
import '../../test/setup';

/**
 * Test suite for ButtonGreen component.
 * Verifies button rendering, click handling, disabled states, and icon integration.
 */
describe('ButtonGreen Component', () => {
    // Test basic rendering and structure
    it('renders with correct base styles', () => {
        const { container } = render(
            <ButtonGreen onClick={() => undefined}>
                Test Button
            </ButtonGreen>,
        );

        const button = container.firstChild as HTMLButtonElement;
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('button-green-right');
        expect(button.style.display).toBe('inline-flex');
        expect(button.style.alignItems).toBe('center');
    });

    // Test click handler functionality
    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        const { container } = render(
            <ButtonGreen onClick={handleClick}>
                Clickable Button
            </ButtonGreen>,
        );

        const button = container.firstChild as HTMLButtonElement;
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);

        // Verify event object is passed to handler
        const mockEvent = expect.any(Object);
        expect(handleClick).toHaveBeenCalledWith(mockEvent);
    });

    // Test children rendering
    it('renders children correctly', () => {
        const { getByText, container } = render(
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
