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

    console.log("Blueprint tree effect:", { root: !!root, path })

    if (!root) {
        selectedBlueprintSignal.value = null
        return
    }

    try {
        if (!path) {
            selectedBlueprintSignal.value = root
            return
        }

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