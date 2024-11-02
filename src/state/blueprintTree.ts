// src/state/blueprintTree.ts
import { signal, effect } from '@preact/signals'
import type { BlueprintString } from '../parsing/types'
import { extractBlueprint } from '../parsing/blueprintParser'

// Global signals for blueprint tree state
export const rootBlueprintSignal = signal<BlueprintString | null>(null)
export const selectedBlueprintPathSignal = signal<string | null>(null)
export const selectedBlueprintSignal = signal<BlueprintString | null>(null)

// Effect to update selected blueprint when path changes
effect(() => {
    const root = rootBlueprintSignal.value
    const path = selectedBlueprintPathSignal.value

    if (!root) {
        selectedBlueprintSignal.value = null
        return
    }

    try {
        // For single blueprints, just use the root
        if (!path) {
            // This is the key fix - if no path is selected but we have a blueprint,
            // select it automatically
            if (root.blueprint) {
                selectedBlueprintPathSignal.value = "1"
                selectedBlueprintSignal.value = root
            } else {
                selectedBlueprintSignal.value = null
            }
            return
        }

        // For blueprint books, extract the selected blueprint
        const extracted = extractBlueprint(root, path)
        selectedBlueprintSignal.value = extracted
    } catch (err) {
        console.error('Failed to extract blueprint:', err)
        selectedBlueprintSignal.value = null
    }
})

// Reset the tree state
export function resetBlueprintTree() {
    rootBlueprintSignal.value = null
    selectedBlueprintPathSignal.value = null
}