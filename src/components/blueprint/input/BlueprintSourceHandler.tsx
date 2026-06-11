import {getRouteApi, useNavigate} from '@tanstack/react-router';
import type React from 'react';
import {useCallback, useEffect, useRef} from 'react';

const routeApi = getRouteApi('/');

interface BlueprintSourceHandlerProps {
	pasted?: string;
	autoFocus?: boolean;
}

const BlueprintSourceHandler = ({pasted, autoFocus = false}: BlueprintSourceHandlerProps) => {
	const navigate = useNavigate({from: routeApi.id});
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	/**
	 * Handles change events for the blueprint input textarea.
	 * Wraps the async navigation logic in a synchronous handler to satisfy React's onChange type.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			e.preventDefault();
			const pastedRaw = e.target.value;
			const pastedValue = pastedRaw.trim();

			void (async () => {
				if (pastedValue === '') {
					await navigate({
						search: (prev) => ({...prev, pasted: undefined, selection: undefined}),
					});
					return;
				}

				await navigate({
					search: (prev) => ({...prev, pasted: pastedValue, selection: ''}),
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
