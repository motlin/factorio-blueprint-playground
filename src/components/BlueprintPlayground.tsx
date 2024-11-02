import {signal} from '@preact/signals'
import {ErrorAlert, Panel} from "./ui"
import {BasicInfoPanel} from './BasicInfoPanel'
import BlueprintTree from './BlueprintTree'
import {deserializeBlueprint} from '../parsing/blueprintParser'
import {
    resetBlueprintTree,
    rootBlueprintSignal,
    selectedBlueprintPathSignal,
    selectedBlueprintSignal
} from '../state/blueprintTree'
// Local UI state signals
const errorSignal = signal<string | null>(null)
const pastedTextSignal = signal<string>('')

export function BlueprintPlayground() {
    const handleBlueprintPaste = async (value: string) => {
        // Update pasted text
        pastedTextSignal.value = value

        // Handle empty input
        if (!value.trim()) {
            resetBlueprintTree()
            errorSignal.value = null
            return
        }


        try {
            errorSignal.value = null
            const parsed = deserializeBlueprint(value.trim())
            rootBlueprintSignal.value = parsed

            // Always select root with empty string path
            selectedBlueprintPathSignal.value = ""
        } catch (err) {
            console.error('Failed to parse blueprint:', err)
            errorSignal.value = err.message
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