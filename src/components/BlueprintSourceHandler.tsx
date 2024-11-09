import {signal} from '@preact/signals';
import {useNavigate, useSearch} from '@tanstack/react-router';
import type {JSX} from 'preact';
import {useCallback, useEffect, useRef} from 'preact/hooks';

import { deserializeBlueprint } from '../parsing/blueprintParser';

interface FactorioSchoolResponse {
    blueprintString: {
        blueprintString: string;
    };
}

interface FactorioPrintsResponse {
    blueprintString: string;
}

// Define a discriminated union type for all possible response types
type BlueprintResponse = FactorioSchoolResponse | FactorioPrintsResponse;

// Blueprint source configuration
interface SourceConfig {
    pattern: RegExp;
    displayUrl: (match: RegExpMatchArray) => string;
    apiUrl: (match: RegExpMatchArray) => string;
    extractBlueprint: (data: BlueprintResponse) => string;
}

const SOURCES: Record<string, SourceConfig> = {
    'factorio.school': {
        pattern: /factorio\.school\/view\/([^/\s]+)/,
        displayUrl: (match) => `https://www.factorio.school/view/${match[1]}`,
        apiUrl: (match) => `https://www.factorio.school/api/blueprint/${match[1]}`,
        extractBlueprint: (data: BlueprintResponse) => {
            if (!('blueprintString' in data) || typeof data.blueprintString !== 'object') {
                throw new Error('Invalid blueprint data from Factorio School');
            }
            return data.blueprintString.blueprintString;
        },
    },
    'factorioprints.com': {
        pattern: /factorioprints\.com\/view\/([^/\s]+)/,
        displayUrl: (match) => `https://factorioprints.com/view/${match[1]}`,
        apiUrl: (match) => `https://facorio-blueprints.firebaseio.com/blueprints/${match[1]}.json`,
        extractBlueprint: (data: BlueprintResponse) => {
            if (!('blueprintString' in data) || typeof data.blueprintString !== 'string') {
                throw new Error('Invalid blueprint data from Factorio Prints');
            }
            return data.blueprintString;
        },
    },
};

type ValidationState =
    | { status: 'initial' }
    | { status: 'testing_url' }
    | { status: 'fetching_url', url: string }
    | { status: 'testing_blueprint' }
    | { status: 'error', message: string }

// Using a ref for the validation ID ensures we can abandon outdated operations
let validationId = 0;

export interface BlueprintSourceHandlerProps {
    onBlueprintString: (value: string) => void
}

// Move signals outside component so they persist
const textValueSignal = signal('');
const originalInputSignal = signal('');
const validationStateSignal = signal<ValidationState>({ status: 'initial' });

// Core fetching logic moved outside component
async function fetchBlueprintFromUrl(
    sourceUrl: string,
    validationId: number,
    currentValidationId: React.RefObject<number>,
): Promise<{ blueprint: string; error?: undefined } | { blueprint?: undefined; error: string }> {
        try {
            const displayUrl = decodeURIComponent(sourceUrl);
            let foundConfig: SourceConfig | null = null;
            let foundMatch: RegExpMatchArray | null = null;

            // Find matching source config
            for (const config of Object.values(SOURCES)) {
                const match = displayUrl.match(config.pattern);
                if (match) {
                    foundConfig = config;
                    foundMatch = match;
                    break;
                }
            }

            if (!foundConfig || !foundMatch) {
                throw new Error('Invalid blueprint URL');
            }

            const response = await fetch(foundConfig.apiUrl(foundMatch));
            if (!response.ok) {
                throw new Error(`Failed to fetch blueprint: ${response.statusText}`);
            }

        if (currentValidationId.current !== validationId) {
            return { error: 'Operation cancelled' };
        }

            const data = await response.json() as BlueprintResponse;
            const blueprint = foundConfig.extractBlueprint(data);

            if (!blueprint) {
                throw new Error('Failed to extract blueprint data');
            }

            // Final validation
            deserializeBlueprint(blueprint); // Will throw if invalid

        return { blueprint };
        } catch (err) {
        return {
            error: err instanceof Error ? err.message : 'Failed to fetch blueprint',
        };
    }
}

export const BlueprintSourceHandler = ({onBlueprintString}: BlueprintSourceHandlerProps) => {
    const search = useSearch({from: '/'});
    const navigate = useNavigate();
    const currentValidationId = useRef(0);

    // Simplified fetchBlueprint that uses the external function
    const fetchBlueprint = useCallback(async (sourceUrl: string) => {
        const thisValidationId = ++validationId;
        currentValidationId.current = thisValidationId;

        originalInputSignal.value = decodeURIComponent(sourceUrl);
        validationStateSignal.value = { status: 'fetching_url', url: sourceUrl };

        const result = await fetchBlueprintFromUrl(sourceUrl, thisValidationId, currentValidationId);

            if (currentValidationId.current !== thisValidationId) return;

        if (result.error) {
            validationStateSignal.value = { status: 'error', message: result.error };
            await navigate({
                to: '/',
                search: (prev) => ({ ...prev, source: undefined, data: undefined }),
                replace: true,
            });
            return;
        }

        // Set state and trigger callback but keep the source URL
        validationStateSignal.value = { status: 'initial' };
        textValueSignal.value = result.blueprint;
        onBlueprintString(result.blueprint);
    }, [navigate]);

    useEffect(() => {
        if (search.data) {
            const decodedData = decodeURIComponent(search.data);
            textValueSignal.value = decodedData;
            void validateInput(decodedData);
            return;
        }

        // Then check source parameter
        if (search.source) {
        void fetchBlueprint(search.source);
        }
    }, [search.data, search.source, fetchBlueprint]);

    const validateInput = async (value: string) => {
        const thisValidationId = ++validationId;
        currentValidationId.current = thisValidationId;

        // Store the original input right away
        originalInputSignal.value = value;

        // Empty input - reset to initial state
        if (!value.trim()) {
            validationStateSignal.value = { status: 'initial' };
            onBlueprintString('');
            // Clear URL parameters
            await navigate({
                to: '/',
                search: (prev) => ({ ...prev, source: undefined, data: undefined }),
                replace: true,
            });
            return;
        }

        // First check for URLs
        validationStateSignal.value = { status: 'testing_url' };
        for (const config of Object.values(SOURCES)) {
            const match = value.match(config.pattern);
            if (match) {
                const encodedUrl = encodeURIComponent(config.displayUrl(match));
                // Only update URL if it's different from current search params
                if (search.source !== encodedUrl) {
                    await navigate({
                        to: '/',
                        search: (prev) => ({
                            ...prev,
                            source: encodedUrl,
                            data: undefined,
                        }),
                        replace: true,
                    });
                } else {
                    // If URL is the same, trigger fetch directly
                    await fetchBlueprint(encodedUrl);
                }
                return;
            }
        }

        // If we get here, test as blueprint
        validationStateSignal.value = { status: 'testing_blueprint' };
        try {
            deserializeBlueprint(value);

            // Update URL to match what was originally pasted
            await navigate({
                to: '/',
                search: {
                    data: originalInputSignal.value,
                    source: undefined,
                },
                replace: true,
            });

            validationStateSignal.value = { status: 'initial' };
            onBlueprintString(value);
        } catch (err) {
            if (currentValidationId.current !== thisValidationId) return;
            validationStateSignal.value = {
                status: 'error',
                message: err instanceof Error ? err.message : 'Invalid blueprint format',
            };
        }
    };

    const handleChange = async (e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
        const value = (e.target as HTMLTextAreaElement).value;
        const prevValue = textValueSignal.value;
        textValueSignal.value = value;

        // Reset validation state even if value hasn't changed
        validationStateSignal.value = { status: 'initial' };

        // Don't revalidate if just updating to match the value we already processed
        if (value !== prevValue) {
            await validateInput(value);
        }
    };

    // Render status message based on state
    const renderStatus = () => {
        const state = validationStateSignal.value;
        let message = '';
        let isError = false;

        switch (state.status) {
            case 'initial':
                return null;
            case 'testing_url':
                message = 'Checking if input is a blueprint URL...';
                break;
            case 'fetching_url':
                message = 'Fetching blueprint from URL...';
                break;
            case 'testing_blueprint':
                message = 'Validating blueprint format...';
                break;
            case 'error':
                message = state.message;
                isError = true;
                break;
        }

        return (
            <div className={`status-message ${isError ? 'error' : ''}`} style={{ minHeight: '2em' }}>
                {message}
            </div>
        );
    };

    const handleFocus = (e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.select();
    };

    return (
        <div>
            <textarea
                placeholder="Paste blueprint or url here..."
                onChange={(e) => void handleChange(e)}
                onFocus={handleFocus}
                value={textValueSignal.value}
                rows={3}
                className="w100p"
                disabled={validationStateSignal.value.status !== 'initial' &&
                    validationStateSignal.value.status !== 'error'}
            />
            {renderStatus()}
        </div>
    );
};

export default BlueprintSourceHandler;
