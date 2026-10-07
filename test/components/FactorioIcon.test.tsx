import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vite-plus/test';

import {FactorioIcon} from '../../src/components/core/icons/FactorioIcon';
import '../../test/setup';

describe('FactorioIcon', () => {
	test('renders the icon for a named signal', () => {
		render(<FactorioIcon icon={{type: 'item', name: 'iron-plate'}} size="large" />);

		expect(screen.getByTestId('icon')).toHaveAttribute(
			'src',
			'https://factorio-icon-cdn.pages.dev/item/iron-plate.webp',
		);
	});

	test('renders nothing for a signal without a name', () => {
		const {container} = render(<FactorioIcon icon={{type: 'item'}} size="large" />);

		expect(container).toBeEmptyDOMElement();
	});
});
