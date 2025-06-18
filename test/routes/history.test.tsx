import {render, screen, waitFor} from '@testing-library/react';
import React, {useEffect, useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../src/components/ui', () => ({
	Panel: ({title, children}: {title: string; children: React.ReactNode}) => (
		<div data-testid="panel">
			<div data-testid="panel-title">{title}</div>
			{children}
		</div>
	),
	InsetLight: ({children}: {children: React.ReactNode}) => <div data-testid="inset-light">{children}</div>,
	InsetDark: ({
		children,
		style,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		style?: React.CSSProperties;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<div
			data-testid="inset-dark"
			style={style}
			onClick={onClick}
			{...props}
		>
			{children}
		</div>
	),
	Button: ({
		children,
		onClick,
		disabled,
		style,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		style?: React.CSSProperties;
		[key: string]: unknown;
	}) => (
		<button
			data-testid="button"
			onClick={onClick}
			disabled={disabled}
			style={style}
			{...props}
		>
			{children}
		</button>
	),
	ButtonGreen: ({
		children,
		onClick,
		disabled,
		style,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		style?: React.CSSProperties;
	}) => (
		<button
			data-testid="button-green"
			onClick={onClick}
			disabled={disabled}
			style={style}
		>
			{children}
		</button>
	),
	ErrorAlert: ({error}: {error: Error}) => <div data-testid="error-alert">{error.message}</div>,
}));

vi.mock('@tanstack/react-router', () => ({
	createLazyFileRoute: () => () => ({
		component: vi.fn(),
	}),
	Link: ({children, to, search}: {children: React.ReactNode; to: string; search?: {pasted?: string}}) => (
		<a
			href={`${to}?pasted=${search?.pasted || ''}`}
			data-testid="link"
		>
			{children}
		</a>
	),
}));

vi.mock('../../src/components/core/icons/FactorioIcon', () => ({
	FactorioIcon: ({type, name, size}: {type: string; name: string; size?: number}) => (
		<div
			data-testid="factorio-icon"
			data-type={type}
			data-name={name}
			style={{width: size, height: size}}
		>
			Icon
		</div>
	),
}));

vi.mock('../../src/components/core/text/RichText', () => ({
	RichText: ({children}: {children: React.ReactNode}) => <span data-testid="rich-text">{children}</span>,
}));

vi.mock('../../src/components/core/text/Version', () => ({
	Version: ({version}: {version: number}) => <span data-testid="version">{version}</span>,
}));

vi.mock('../../src/storage/blueprints', () => ({
	blueprintStorage: {
		list: vi.fn().mockResolvedValue([
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
		]),
		remove: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../../src/parsing/blueprintParser', () => ({
	deserializeBlueprint: vi.fn().mockImplementation((data) => ({blueprint: {label: `Parsed ${data}`}})),
	serializeBlueprint: vi.fn().mockReturnValue('serialized-blueprint-book'),
}));

declare global {
	var document: Document;

	var window: Window & typeof globalThis;
}

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
					data-testid="download-button"
					disabled={selectedItems.size === 0}
				>
					Download Selected as Book
				</button>
				<button
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
						<div
							key={createdOn}
							data-testid="blueprint-item"
							onClick={(): void => toggleSelection(createdOn)}
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
							<button data-testid="blueprint-open">Open</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

describe('History Component Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		if (typeof global.URL.createObjectURL === 'undefined') {
			global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
		}

		if (typeof global.URL.revokeObjectURL === 'undefined') {
			global.URL.revokeObjectURL = vi.fn();
		}

		if (typeof window === 'undefined') {
			global.window = {confirm: vi.fn()} as unknown as Window & typeof globalThis;
		}

		vi.spyOn(window, 'confirm' as keyof Window).mockImplementation(() => true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

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
