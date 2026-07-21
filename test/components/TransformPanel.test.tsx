import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {shiftTier} from '../../src/transform/upgradeTier';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn<(options: unknown) => void>()}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => navigate,
}));

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

describe('TransformPanel', () => {
	beforeEach(() => {
		navigate.mockReset();
	});

	test('renders nothing without a blueprint or for a planner', () => {
		const {container, rerender} = render(<TransformPanel />);
		expect(container.innerHTML).toBe('');

		rerender(
			<TransformPanel
				blueprint={{upgrade_planner: {item: 'upgrade-planner', version: 0, settings: {mappers: []}}}}
			/>,
		);
		expect(container.innerHTML).toBe('');
	});

	test('offers tier actions for blueprints and books', () => {
		const {rerender} = render(<TransformPanel blueprint={blueprint} />);
		expect(screen.getAllByRole('button').map((button) => button.textContent)).toStrictEqual([
			'Upgrade',
			'Downgrade',
		]);

		rerender(<TransformPanel blueprint={{blueprint_book: {item: 'blueprint-book', version: 0, blueprints: []}}} />);
		expect(screen.getAllByRole('button').map((button) => button.textContent)).toStrictEqual([
			'Upgrade',
			'Downgrade',
		]);
	});

	test('renders reusable export actions after applying a transformation', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Upgrade'}));

		expect(screen.getAllByRole('button').map((button) => button.textContent.trim())).toStrictEqual([
			'Upgrade',
			'Downgrade',
			'Copy String',
			'Copy JSON',
			'Download String',
			'Open in Playground',
		]);
		expect(screen.getByRole('heading', {name: 'Export Transformed Blueprint'}).textContent).toBe(
			'Export Transformed Blueprint',
		);
	});

	test('opens the serialized result in the playground', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Upgrade'}));
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(shiftTier(blueprint, 1)),
				selection: '',
			},
		});
	});
});
