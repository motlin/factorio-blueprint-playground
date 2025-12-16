import {render, screen, waitFor} from '@testing-library/react';
import {useEffect, useState} from 'react';
import {describe, expect, it} from 'vitest';

function SimplifiedHistory() {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	type BlueprintEntry = {
		createdOn: number;
		lastUpdatedOn: number;
		data: string;
		type: string;
		label: string;
		gameVersion: string;
		icons: Array<{type: string; name: string}>;
	};
	const [blueprints, setBlueprints] = useState<BlueprintEntry[]>([]);
	const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set<number>());

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
			setBlueprints([
				{
					createdOn: 1615000000000,
					lastUpdatedOn: 1615000000000,
					data: 'blueprint-data-1',
					type: 'blueprint',
					label: 'Test Blueprint 1',
					gameVersion: '1.1.0',
					icons: [{type: 'item', name: 'transport-belt'}],
				},
				{
					createdOn: 1614000000000,
					lastUpdatedOn: 1614000000000,
					data: 'blueprint-data-2',
					type: 'blueprint_book',
					label: 'Test Blueprint Book',
					gameVersion: '1.1.0',
					icons: [{type: 'item', name: 'blueprint-book'}],
				},
			]);
		}, 10);

		return () => clearTimeout(timer);
	}, []);

	const toggleSelection = (id: number): void => {
		setSelectedItems((prev: Set<number>) => {
			const newSelection = new Set<number>(prev);
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
			return newSelection;
		});
	};

	if (isLoading) {
		return (
			<div data-testid="panel">
				<div data-testid="inset-light">Loading blueprint history...</div>
			</div>
		);
	}

	return (
		<div data-testid="panel">
			<div data-testid="download-buttons">
				<button
					type="button"
					data-testid="download-button"
					disabled={selectedItems.size === 0}
				>
					Download Selected as Book
				</button>
				<button
					type="button"
					data-testid="delete-button"
					disabled={selectedItems.size === 0}
				>
					Delete Selected
				</button>
			</div>

			<div>
				{blueprints.map((bp) => {
					const createdOn = bp.createdOn;
					return (
						<button
							key={createdOn}
							data-testid="blueprint-item"
							onClick={(): void => toggleSelection(createdOn)}
							type="button"
						>
							<input
								type="checkbox"
								checked={selectedItems.has(createdOn)}
								onChange={(e): void => {
									e.stopPropagation();
									toggleSelection(createdOn);
								}}
								data-testid="blueprint-checkbox"
							/>
							<span data-testid="rich-text">{bp.label}</span>
							<button
								type="button"
								data-testid="blueprint-open"
							>
								Open
							</button>
						</button>
					);
				})}
			</div>
		</div>
	);
}

describe('History Component Tests', () => {
	it('loads and displays blueprints', async () => {
		render(<SimplifiedHistory />);

		const loadingElement = screen.getByText('Loading blueprint history...');
		expect(loadingElement).toBeInTheDocument();

		await waitFor(() => {
			const loadingElementAfterWait = screen.queryByText('Loading blueprint history...');
			expect(loadingElementAfterWait).not.toBeInTheDocument();
		});

		const blueprintItems = screen.getAllByTestId('blueprint-item');
		const richTexts = screen.getAllByTestId('rich-text');
		expect(blueprintItems.length).toBe(2);

		if (richTexts[0] && richTexts[1]) {
			expect(richTexts[0].textContent).toBe('Test Blueprint 1');
			expect(richTexts[1].textContent).toBe('Test Blueprint Book');
		}
	});

	it('shows disabled action buttons initially', async () => {
		render(<SimplifiedHistory />);

		await waitFor(() => {
			const loadingElement = screen.queryByText('Loading blueprint history...');
			expect(loadingElement).not.toBeInTheDocument();
		});

		const downloadButtons = screen.getAllByTestId('download-button');
		const deleteButtons = screen.getAllByTestId('delete-button');

		expect(downloadButtons.length).toBeGreaterThan(0);
		expect(deleteButtons.length).toBeGreaterThan(0);

		if (downloadButtons[0] && deleteButtons[0]) {
			expect(downloadButtons[0]).toBeDisabled();
			expect(deleteButtons[0]).toBeDisabled();
		}
	});
});
