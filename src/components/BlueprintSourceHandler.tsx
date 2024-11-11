import {useNavigate, useSearch} from '@tanstack/react-router';
import type {JSX} from 'preact';
import {useCallback, useEffect} from 'preact/hooks';
import {inputStringSignal, processingStateSignal, processInput} from '../state/blueprintState';
import {ErrorAlert} from './ui';

export const BlueprintSourceHandler = () => {
    const search = useSearch({from: '/'});
    const navigate = useNavigate();

    // Handle URL parameters on mount and search changes
    useEffect(() => {
        if (search.data) {
            void processInput(search.data, 'data');
        } else if (search.json) {
            void processInput(search.json, 'json');
        } else if (search.source) {
            void processInput(search.source, 'url');
        }
    }, [search.data, search.json, search.source]);

    const handleChange = useCallback((e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
        const value = (e.target as HTMLTextAreaElement).value;
        void processInput(value, 'paste', navigate);
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
