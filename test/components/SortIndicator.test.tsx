import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';

import {SortIndicator} from '../../src/components/history/table/SortIndicator';

test('renders ascending sort indicator', () => {
	render(<SortIndicator direction="asc" />);
	const element = screen.getByText('↑');
	expect(element).toBeInTheDocument();
	expect(element.className).toContain('sort-indicator');
});

test('renders descending sort indicator', () => {
	render(<SortIndicator direction="desc" />);
	const element = screen.getByText('↓');
	expect(element).toBeInTheDocument();
	expect(element.className).toContain('sort-indicator');
});

test('does not render when direction is null', () => {
	const {container} = render(<SortIndicator direction={null} />);
	expect(container.firstChild).toBeNull();
});
