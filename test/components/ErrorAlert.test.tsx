import {render} from '@testing-library/react';
import {describe, expect, test} from 'vite-plus/test';

import {ErrorAlert} from '../../src/components/ui/ErrorAlert';
import {BlueprintError} from '../../src/parsing/blueprintParser';

describe('ErrorAlert', () => {
	test('shows only the message for blueprint errors, which describe the input rather than a crash', () => {
		const {container} = render(<ErrorAlert error={new BlueprintError('Unsupported blueprint.')} />);

		expect({text: container.textContent, stack: container.querySelector('pre')}).toStrictEqual({
			text: 'Unsupported blueprint.',
			stack: null,
		});
	});

	test('shows the stack for unexpected errors', () => {
		const error = new Error('Something broke.');
		error.stack = 'Error: Something broke.\n    at somewhere';
		const {container} = render(<ErrorAlert error={error} />);

		expect(container.querySelector('pre')?.textContent).toBe('Error: Something broke.\n    at somewhere');
	});
});
