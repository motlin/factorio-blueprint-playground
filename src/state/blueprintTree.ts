// src/state/blueprintTree.ts
import { signal, computed, batch } from '@preact/signals';
import type { BlueprintString } from '../parsing/types';
import { extractBlueprint } from '../parsing/blueprintParser';

// Global signals for blueprint tree state
export const rootBlueprintSignal = signal<BlueprintString | null>(null);
export const selectedBlueprintPathSignal = signal<string | null>(null);

// Computed signal that extracts the selected blueprint
export const selectedBlueprintSignal = computed(() => {
    const root = rootBlueprintSignal.value;
    const path = selectedBlueprintPathSignal.value;

    if (!root) return null;
    if (!path) return root;

    try {
        return extractBlueprint(root, path);
    } catch (err) {
        console.error('Failed to extract blueprint:', err);
        return null;
    }
});

// Reset the tree state
export function resetBlueprintTree() {
    batch(() => {
    rootBlueprintSignal.value = null;
    selectedBlueprintPathSignal.value = null;
    });
}

// Select a blueprint by path
export function selectBlueprintPath(path: string) {
    selectedBlueprintPathSignal.value = path;
}
