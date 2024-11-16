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
    const search = useSearch({from: '/'}) as RootSearchSchema;
    const navigate = useNavigate();

    // Handle URL parameters on mount and search changes
    useEffect(() => {
        if (typeof search.data === 'string') {
            void processBlueprint(search.data, 'data');
        } else if (typeof search.json === 'string') {
            void processBlueprint(search.json, 'json');
        } else if (typeof search.source === 'string') {
            void processBlueprint(search.source, 'url');
        }
    }, [search.data, search.json, search.source]);

    const handleChange = useCallback((e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
        const value = (e.target as HTMLTextAreaElement).value;
        void handlePastedInput(value, navigate);
    }, [navigate]);

    const handleFocus = useCallback((e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.select();
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
