import {useNavigate} from '@tanstack/react-router';
import type {JSX} from 'preact';
import {useCallback} from 'preact/hooks';

import {Route} from '../routes';

interface BlueprintSourceHandlerProps {
	pasted?: string;
}

export const BlueprintSourceHandler = ({pasted}: BlueprintSourceHandlerProps) => {
	const navigate = useNavigate({from: Route.fullPath});

	/**
	 * Handles change events for the blueprint input textarea.
	 * Wraps the async navigation logic in a synchronous handler to satisfy React's onChange type.
	 */
	const handleChange = useCallback(
		(e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
			e.preventDefault();
			const pasted = (e.target as HTMLTextAreaElement).value;

			// Execute navigation in a non-blocking way
			void (async () => {
				if (!pasted.trim()) {
					await navigate({
						search: {pasted: undefined, selection: undefined},
					});
					return;
				}

				await navigate({
					search: {pasted, selection: ''},
				});
			})();
		},
		[navigate],
	);

	/**
	 * Handles focus events by selecting all text in the textarea.
	 */
	const handleFocus = useCallback((e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
		e.preventDefault();
		e.currentTarget.select();
	}, []);

	// TODO: 2024-11-30: Show error alert for router errors
	return (
		<div>
			<textarea
				placeholder="Paste blueprint string, JSON, or URL here..."
				onChange={handleChange}
				onFocus={handleFocus}
				value={pasted}
				rows={3}
				className="w100p"
				// TODO: 2024-11-30: disable while tanstack router is loading data
				disabled={false}
			/>
		</div>
	);
};

export default BlueprintSourceHandler;
