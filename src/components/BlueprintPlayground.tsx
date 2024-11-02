import { signal, effect } from '@preact/signals'
import type {BlueprintString} from '../parsing/types'
import {ErrorAlert, Panel, Textarea} from "./ui"
import {BasicInfoPanel} from './BasicInfoPanel'
import BlueprintTree from './BlueprintTree'
import { deserializeBlueprint, extractBlueprint } from '../parsing/blueprintParser'
import {
    rootBlueprintSignal,
    selectedBlueprintPathSignal,
    selectedBlueprintSignal,
    resetBlueprintTree
} from '../state/blueprintTree'
// Local UI state signals
const errorSignal = signal<string | null>(null)
const parseStateSignal = signal<'idle' | 'parsing' | 'success' | 'error'>('idle')
const pastedTextSignal = signal<string>('')

export function BlueprintPlayground() {
    const handleBlueprintPaste = async (value: string) => {
        // Update pasted text
        pastedTextSignal.value = value

        // Handle empty input
        if (!value.trim()) {
            resetBlueprintTree()
            errorSignal.value = null
            parseStateSignal.value = 'idle'
            return
        }

        console.log('Parsing blueprint...', {
            length: value.length,
            preview: value.slice(0, 50) + '...'
        })

        parseStateSignal.value = 'parsing'

        try {
            errorSignal.value = null
            const parsed = deserializeBlueprint(value.trim())
            rootBlueprintSignal.value = parsed

            // For plain blueprints, select them immediately
            if (parsed.blueprint) {
                selectedBlueprintPathSignal.value = "1"
            } else {
                selectedBlueprintPathSignal.value = null
            }

            parseStateSignal.value = 'success'
            console.log('Parsed blueprint:', parsed)

        } catch (err) {
            console.error('Failed to parse blueprint:', err)
            errorSignal.value = err.message
            parseStateSignal.value = 'error'
            resetBlueprintTree()
        }
    }

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <textarea
                    placeholder="Paste your blueprint here..."
                    onChange={(e) => handleBlueprintPaste(e.target.value)}
                    value={pastedTextSignal.value}
                    rows={3}
                    className="w100p"
                />

                {/* Parse state indicator */}
                {parseStateSignal.value === 'parsing' && (
                    <div className="text-center p8 blue">
                        Parsing blueprint...
                    </div>
                )}

                <ErrorAlert error={errorSignal.value}/>
            </Panel>

            <div className="panels2">
                {/* Left side */}
                <div>
                    {rootBlueprintSignal.value?.blueprint_book && (
                        <Panel title="Blueprint Tree">
                            <BlueprintTree />
                        </Panel>
                    )}
                </div>

                {/* Right side */}
                <div>
                    {selectedBlueprintSignal.value && (
                        <BasicInfoPanel blueprint={selectedBlueprintSignal.value}/>
                    )}
                </div>
            </div>
        </div>
    )
}

export default BlueprintPlayground