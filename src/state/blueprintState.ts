import {batch, computed, signal} from '@preact/signals';
import {useNavigate} from '@tanstack/react-router';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

// Input method tracking
export type InputMethod = 'data' | 'json' | 'url' | 'paste' | null;
export const inputMethodSignal = signal<InputMethod>(null);

// Raw input string
export const inputStringSignal = signal<string>('');

// Validation/processing state
export type ProcessingState =
    | { status: 'initial' }
    | { status: 'validating', message: string }
    | { status: 'error', message: string }
    | { status: 'success', blueprint: BlueprintString };

export const processingStateSignal = signal<ProcessingState>({ status: 'initial' });

// Selected path within the blueprint tree
export const selectedPathSignal = signal<string | null>(null);

// Computed signal for the root blueprint
export const rootBlueprintSignal = computed(() => {
    const state = processingStateSignal.value;
    return state.status === 'success' ? state.blueprint : null;
});

interface BlueprintApiResponse {
    blueprintString?: {
        blueprintString: string;
    };
}
export async function processInput(
    input: string,
    method: InputMethod,
    navigate?: ReturnType<typeof useNavigate>,
): Promise<void> {
    if (!input.trim()) {
        batch(() => {
            inputStringSignal.value = '';
            inputMethodSignal.value = null;
            processingStateSignal.value = { status: 'initial' };
            selectedPathSignal.value = null;
        });
        if (navigate) {
            await navigate({
                to: '/',
                search: { source: undefined, data: undefined, json: undefined },
                replace: true,
            });
        }
        return;
    }

    batch(() => {
        inputStringSignal.value = input;
        inputMethodSignal.value = method;
        processingStateSignal.value = { status: 'validating', message: 'Processing input...' };
    });

    try {
        let blueprint: BlueprintString;

        switch (method) {
            case 'data':
                blueprint = deserializeBlueprint(input);
                break;
            case 'json':
                blueprint = JSON.parse(input) as BlueprintString;
                break;
            case 'url': {
                // Extract domain to determine API
                const url = new URL(input);
                const domain = url.hostname;

                const fetchConfig = getSourceConfig(domain);
                if (!fetchConfig) {
                    throw new Error('Unsupported blueprint source');
                }

                const response = await fetch(fetchConfig.apiUrl(input));
                if (!response.ok) {
                    throw new Error(`Failed to fetch blueprint: ${response.statusText}`);
                }

                function isBlueprintApiResponse(data: unknown): data is BlueprintApiResponse {
                    return (
                        typeof data === 'object' &&
                        data !== null &&
                        'blueprintString' in data &&
                        typeof data.blueprintString === 'object'
                    );
                }

                const data: unknown = await response.json();

                if (!isBlueprintApiResponse(data)) {
                    throw new Error('Invalid response from API');
                }
                const blueprintString = fetchConfig.extractBlueprintString(data);
                blueprint = deserializeBlueprint(blueprintString);
                break;
            }
            case 'paste':
                // Try each format in order
                try {
                    blueprint = deserializeBlueprint(input);
                    method = 'data';
                } catch {
                    try {
                        blueprint = JSON.parse(input) as BlueprintString;
                        method = 'json';
                    } catch {
                        // Check if it's a URL
                        if (input.match(/factorio\.(school|prints)\.com/)) {
                            return processInput(input, 'url', navigate);
                        }
                        throw new Error('Invalid input format');
                    }
                }
                break;
            default:
                throw new Error('Invalid input method');
        }

        // Update state on success
        batch(() => {
            processingStateSignal.value = {
                status: 'success',
                blueprint,
            };
            inputMethodSignal.value = method;
            selectedPathSignal.value = null; // Reset selection on new blueprint
        });

        // Update URL if navigating and method isn't URL (to avoid loops)
        if (navigate && method !== 'url') {
            const search = method === 'data'
                ? { data: input, source: undefined, json: undefined }
                : method === 'json'
                    ? { json: input, source: undefined, data: undefined }
                    : { source: input, data: undefined, json: undefined };

            await navigate({
                to: '/',
                search,
                replace: true,
            });
        }
    } catch (err) {
        batch(() => {
            processingStateSignal.value = {
                status: 'error',
                message: err instanceof Error ? err.message : 'Processing failed',
            };
            selectedPathSignal.value = null;
        });
    }
}

interface SourceConfig {
    apiUrl: (url: string) => string;
    extractBlueprintString: (data: unknown) => string;
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
    'factorio.school': {
        apiUrl: (url) => {
            const match = url.match(/factorio\.school\/view\/([^/\s]+)/);
            if (!match) throw new Error('Invalid Factorio School URL');
            return `https://www.factorio.school/api/blueprint/${match[1]}`;
        },
        extractBlueprintString: (data) => {
            if (!data || typeof data !== 'object' || !('blueprintString' in data)) {
                throw new Error('Invalid response from Factorio School');
            }
            const bpData = data as { blueprintString: { blueprintString: string } };
            return bpData.blueprintString.blueprintString;
        },
    },
    'factorioprints.com': {
        apiUrl: (url) => {
            const match = url.match(/factorioprints\.com\/view\/([^/\s]+)/);
            if (!match) throw new Error('Invalid Factorio Prints URL');
            return `https://factorio-blueprints.firebaseio.com/blueprints/${match[1]}.json`;
        },
        extractBlueprintString: (data) => {
            if (!data || typeof data !== 'object' || !('blueprintString' in data)) {
                throw new Error('Invalid response from Factorio Prints');
            }
            const bpData = data as { blueprintString: string };
            return bpData.blueprintString;
        },
    },
};

function getSourceConfig(hostname: string): SourceConfig | null {
    if (hostname.includes('factorio.school')) return SOURCE_CONFIGS['factorio.school'];
    if (hostname.includes('factorioprints.com')) return SOURCE_CONFIGS['factorioprints.com'];
    return null;
}
