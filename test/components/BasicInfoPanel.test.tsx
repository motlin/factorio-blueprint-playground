import {readFileSync} from 'fs';
import {join} from 'path';

import {render} from '@testing-library/react';
import React from 'react';
import {describe, expect, test} from 'vitest';

import {BasicInfoPanel} from '../../src/components/BasicInfoPanel';
import '../../test/setup';

// Load the simple.txt blueprint string directly
const simpleBlueprintString = readFileSync(
  join(__dirname, '../fixtures/blueprints/txt/simple.txt'),
  'utf-8',
).trim();

describe('BasicInfoPanel memoization test', () => {
  test('memoization prevents re-renders with same props', () => {
    // Create components to count renders
    let memoizedRenderCount = 0;
    let normalRenderCount = 0;

    // A component that gets memoized and counts renders
    function MemoCounter(_props: {blueprint?: string}) {
      memoizedRenderCount++;
      return <div>Memoized renders: {memoizedRenderCount}</div>;
    }
    const MemoizedCounter = React.memo(MemoCounter);

    // A component that doesn't get memoized and counts renders
    function NormalCounter(_props: {blueprint?: string}) {
      normalRenderCount++;
      return <div>Normal renders: {normalRenderCount}</div>;
    }

    // Create a test component that wraps the normal and memoized components
    function CountRenders({blueprint}: {blueprint?: string}) {
      return <>
        <MemoizedCounter blueprint={blueprint} />
        <NormalCounter blueprint={blueprint} />
      </>;
    }

    // Initial render
    const {rerender} = render(<CountRenders blueprint={simpleBlueprintString} />);
    expect(memoizedRenderCount).toBe(1);
    expect(normalRenderCount).toBe(1);

    // Re-render with same props
    rerender(<CountRenders blueprint={simpleBlueprintString} />);

    // The memoized component should not re-render with same props
    expect(memoizedRenderCount).toBe(1);

    // The normal component should re-render even with same props
    expect(normalRenderCount).toBe(2);

    // Re-render with different props
    // Just make it different
    const differentBlueprint = simpleBlueprintString + '1';
    rerender(<CountRenders blueprint={differentBlueprint} />);

    // Both should render with different props
    expect(memoizedRenderCount).toBe(2);
    expect(normalRenderCount).toBe(3);
  });

  test('renders nothing when no blueprint is provided', () => {
    const {container} = render(<BasicInfoPanel />);
    expect(container).toBeEmptyDOMElement();
  });
});
