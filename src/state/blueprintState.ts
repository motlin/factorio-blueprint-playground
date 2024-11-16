import {batch, computed, signal} from '@preact/signals';
import {useNavigate} from '@tanstack/react-router';

import {deserializeBlueprint, extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

// Input method tracking
export type InputMethod = 'data' | 'json' | 'url' | 'paste' | null;
export const inputMethodSignal = signal<InputMethod>(null);

// Raw input string
export const inputStringSignal = signal<string>('');

// Track the blueprint ID for Disqus comments
export const blueprintIdSignal = signal<string | null>(null);

// Extract blueprint ID from either factorioprints.com or factorio.school URLs
function extractBlueprintId(url: string): string | null {
    try {
        const urlObj = new URL(url);

        // Handle factorioprints.com URLs
        if (urlObj.hostname.includes('factorioprints.com')) {
            const match = url.match(/factorioprints\.com\/view\/([^/\s#]+)/);
            return match?.[1] || null;
        }

        // Handle factorio.school URLs - same ID pattern
        if (urlObj.hostname.includes('factorio.school')) {
            const match = url.match(/factorio\.school\/view\/([^/\s#]+)/);
            return match?.[1] || null;
        }

        return null;
    } catch {
        return null;
    }
}

// Generate the canonical Factorioprints URL for Disqus
export function getFactorioprintsUrl(id: string): string {
    return `https://factorioprints.com/view/${id}`;
}

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

// Computed signal for the selected blueprint
export const selectedBlueprintSignal = computed(() => {
    const rootBlueprint = rootBlueprintSignal.value;
    const path = selectedPathSignal.value;

    if (!rootBlueprint) return null;
    if (!path) return rootBlueprint;

    try {
        return extractBlueprint(rootBlueprint, path);
    } catch (err) {
        console.error('Failed to extract blueprint:', err);
        return null;
    }
});

// Function to select a blueprint by path
export function selectBlueprintPath(path: string | null) {
    selectedPathSignal.value = path;
}

// Types for tree structure
export interface TreeNode {
    path: string;
    blueprint: BlueprintString;
    children: TreeNode[];
}

// Computed signal for extracting tree structure
export const blueprintTreeSignal = computed(() => {
    const root = rootBlueprintSignal.value;
    if (!root) return null;

    function buildNode(blueprint: BlueprintString, path: string): TreeNode {
        const children = blueprint.blueprint_book?.blueprints.map((child, index) => {
            const childPath = path ? `${path}.${index + 1}` : `${index + 1}`;
            return buildNode(child, childPath);
        }) ?? [];

        return {
            path,
            blueprint,
            children,
        };
    }

    return buildNode(root, '');
});

function detectInputType(input: string): InputMethod {
    // Simple URL detection
    if (input.match(/^https?:\/\//i)) {
        return 'url';
    }

    // Simple JSON detection - try parsing as JSON
    try {
        JSON.parse(input);
        return 'json';
    } catch {
        // If not URL or JSON, assume it's blueprint data
        return 'data';
    }
}

export async function handlePastedInput(
    input: string,
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

    // Detect input type and update URL accordingly
    const detectedMethod = detectInputType(input);

    function getSearch() {
        if (detectedMethod === 'url') {
            return {source: input, data: undefined, json: undefined};
        }
        if (detectedMethod === 'json') {
            return {json: input, source: undefined, data: undefined};
        }
        if (detectedMethod === 'data') {
            return {data: input, source: undefined, json: undefined};
        }
    }

    if (navigate) {
        const search = getSearch();

        await navigate({
            to: '/',
            search,
            replace: true,
        });
    }
}

export async function processBlueprint(
    input: string,
    method: InputMethod,
): Promise<void> {
    if (!input || !method || method === 'paste') {
        blueprintIdSignal.value = null;
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
                blueprintIdSignal.value = null;
                break;
            case 'json':
                blueprint = JSON.parse(input) as BlueprintString;
                blueprintIdSignal.value = null;
                break;
            case 'url': {
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

                const data: unknown = await response.json();
                const blueprintString = fetchConfig.extractBlueprintString(data);
                blueprint = deserializeBlueprint(blueprintString);

                // Extract and store blueprint ID if from a supported source
                const id = extractBlueprintId(input);
                blueprintIdSignal.value = id;
                break;
            }
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
            selectedPathSignal.value = null;
        });
    } catch (err) {
        batch(() => {
            processingStateSignal.value = {
                status: 'error',
                message: err instanceof Error ? err.message : 'Processing failed',
            };
            selectedPathSignal.value = null;
            blueprintIdSignal.value = null;
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
            const match = url.match(/factorio\.school\/view\/([^/\s#]+)/);
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
            const match = url.match(/factorioprints\.com\/view\/([^/\s#]+)/);
            if (!match) throw new Error('Invalid Factorio Prints URL');
            return `https://facorio-blueprints.firebaseio.com/blueprints/${match[1]}/blueprintString.json`;
        },
        extractBlueprintString: (data) => {
            if (!data || typeof data !== 'string') {
                throw new Error('Invalid response from Factorio Prints');
            }
            return data;
        },
    },
};

function getSourceConfig(hostname: string): SourceConfig | null {
    if (hostname.includes('factorio.school')) return SOURCE_CONFIGS['factorio.school'];
    if (hostname.includes('factorioprints.com')) return SOURCE_CONFIGS['factorioprints.com'];
    return null;
}
