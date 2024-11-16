import {useNavigate, useSearch} from '@tanstack/react-router';
import type {JSX} from 'preact';
import {useCallback, useEffect} from 'preact/hooks';

import {RootSearchSchema} from '../routes/__root';
import {
    inputStringSignal,
    processingStateSignal,
    handlePastedInput,
    processBlueprint,
} from '../state/blueprintState';

import {ErrorAlert} from './ui';

export const BlueprintSourceHandler = () => {
    const search: RootSearchSchema = useSearch({from: '/'});
    const navigate = useNavigate();

    // Handle URL parameters on mount and search changes
    useEffect(() => {
        try {
            if (typeof search.data === 'string') {
                void processBlueprint(search.data, 'data');
            } else if (typeof search.json === 'string') {
                void processBlueprint(search.json, 'json');
            } else if (typeof search.source === 'string') {
                void processBlueprint(search.source, 'url');
            }
        } catch (error) {
            console.error('Error processing blueprint from URL parameters:', error);
            // Make sure we propagate a properly structured error
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to process blueprint from URL parameters', { cause: error });
        }
    }, [search.data, search.json, search.source]);

    const handleChange = useCallback((e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
        try {
            const value = (e.target as HTMLTextAreaElement).value;
            void handlePastedInput(value, navigate);
        } catch (error) {
            console.error('Error handling pasted input:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to handle pasted input', { cause: error });
        }
    }, [navigate]);

    const handleFocus = useCallback((e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
        try {
            e?.currentTarget?.select();
        } catch (error) {
            console.error('Error handling focus:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to handle focus event', { cause: error });
        }
    }, []);

    const state = processingStateSignal.value;
    const validating = state.status === 'validating';
    const error = state.status === 'error' ? state.message : null;

    return (
        <div>
            <textarea
                placeholder="Paste blueprint string, JSON, or URL here..."
                onChange={handleChange}
                onFocus={handleFocus}
                value={inputStringSignal.value}
                rows={3}
                className="w100p"
                disabled={validating}
            />
            {validating && state.status === 'validating' && (
                <div className="status-message">
                    {state.message}
                </div>
            )}
            <ErrorAlert error={error} />
        </div>
    );
};

export default BlueprintSourceHandler;
