import {render, screen} from '@testing-library/react';
import React from 'react';
import {describe, expect, it} from 'vitest';

import {TableHeader} from '../../src/components/history/table/TableHeader';

describe('TableHeader Component', () => {
  it('renders with default className', () => {
    render(<TableHeader label="Test Header" />);

    const headerElement = screen.getByText('Test Header');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement.className).toBe('history-header');
  });

  it('renders with custom className', () => {
    render(<TableHeader label="Custom Header" className="custom-header" />);

    const headerElement = screen.getByText('Custom Header');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement.className).toBe('custom-header');
  });

  it('renders empty label', () => {
    const {container} = render(<TableHeader label="" />);

    const headerElement = container.querySelector('.history-header');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement?.textContent).toBe('');
  });
});
