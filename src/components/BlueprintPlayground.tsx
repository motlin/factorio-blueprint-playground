import {signal} from '@preact/signals'
import {deserializeBlueprint} from '../parsing/blueprintParser'
import type {BlueprintString} from '../parsing/types'
import {ErrorAlert, Panel, Textarea} from "./ui"
import {BasicInfoPanel} from './BasicInfoPanel'

// Local UI state signals
const errorSignal = signal<string | null>(null)
const parseStateSignal = signal<'idle' | 'parsing' | 'success' | 'error'>('idle')
const currentBlueprintSignal = signal<BlueprintString | null>(null)
const pastedTextSignal = signal<string>('')

export function BlueprintPlayground() {
    const handleBlueprintPaste = async (value: string) => {
        // Update pasted text
        pastedTextSignal.value = value

        // Handle empty input
        if (!value.trim()) {
            currentBlueprintSignal.value = null
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
            currentBlueprintSignal.value = parsed
            parseStateSignal.value = 'success'
            console.log('Parsed blueprint:', parsed)

        } catch (err) {
            console.error('Failed to parse blueprint:', err)
            errorSignal.value = err.message
            parseStateSignal.value = 'error'
            currentBlueprintSignal.value = null
        }
    }

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <Textarea
                    placeholder="Paste your blueprint here..."
                    onChange={handleBlueprintPaste}
                    value={pastedTextSignal.value}
                    rows={3}
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
                    {currentBlueprintSignal.value && (
                        <BasicInfoPanel blueprint={currentBlueprintSignal.value}/>
                    )}
                </div>

                {/* Right side */}
                <div>
                </div>
            </div>
        </div>
    )
}