import {useNavigate} from '@tanstack/react-router';
import React, {useCallback, useEffect, useRef} from 'react';

import {Route} from '../routes';

interface BlueprintSourceHandlerProps {
	pasted?: string;
	autoFocus?: boolean;
}

export const BlueprintSourceHandler = ({pasted, autoFocus = false}: BlueprintSourceHandlerProps) => {
	const navigate = useNavigate({from: Route.fullPath});
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	/**
	 * Handles change events for the blueprint input textarea.
	 * Wraps the async navigation logic in a synchronous handler to satisfy React's onChange type.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			e.preventDefault();
			const pasted = e.target.value;

			void (async () => {
				if (!pasted || !pasted.trim()) {
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
	const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
		e.preventDefault();
		e.currentTarget.select();
	}, []);

	useEffect(() => {
		if (autoFocus && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [autoFocus]);

	// TODO: 2024-11-30: Show error alert for router errors
	return (
		<div>
			<textarea
				ref={textareaRef}
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
