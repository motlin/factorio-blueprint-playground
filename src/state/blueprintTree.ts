import {computed} from '@preact/signals';

import {extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';

import {rootBlueprintSignal, selectedPathSignal} from './blueprintState';

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

// Types for tree structure
export interface TreeNode {
    path: string;
    blueprint: BlueprintString;
    children: TreeNode[];
}
