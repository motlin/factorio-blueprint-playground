import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ErrorComponent } from '../../src/components/ErrorComponent';
import '../../test/setup';

/**
 * Test suite for ErrorComponent.
 * Verifies error message rendering and status code display behavior.
 */
describe('ErrorComponent', () => {
    // Test basic error message rendering
    it('renders error message correctly', () => {
        const testError = { message: 'Test error message' };
        const { container, getByText } = render(<ErrorComponent error={testError} />);

        // Verify component structure
        const panel = container.firstChild;
        expect(panel).toHaveClass('panel', 'alert', 'alert-error');

        // Verify error heading
        const heading = container.querySelector('h2');
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe('Error');

        // Verify error message
        const message = getByText(testError.message);
        expect(message).toBeInTheDocument();
    });

    // Test error with status code
    it('displays status code when provided', () => {
        const testError = {
            message: 'Not Found',
            status: 404,
        };
        const { getByText } = render(<ErrorComponent error={testError} />);

        // Verify status code display
        const statusText = getByText('Status: 404');
        expect(statusText).toBeInTheDocument();
        expect(statusText.textContent).toBe('Status: 404');
    });

    // Test error without status code
    it('omits status code when not provided', () => {
        const testError = { message: 'Generic error' };
        const { container } = render(<ErrorComponent error={testError} />);

        // Verify no status code is displayed
        const statusElements = container.textContent?.match(/Status:/g);
        expect(statusElements).toBeNull();
    });

    // Test error with HTML content sanitization
    it('sanitizes HTML content in error message', () => {
        const testError = {
            message: '<script>alert("xss")</script>Malicious content',
        };
        const { container } = render(<ErrorComponent error={testError} />);

        // Verify HTML content is rendered as text
        expect(container.innerHTML).not.toContain('<script>');
        expect(container.textContent).toContain('Malicious content');
    });
});
