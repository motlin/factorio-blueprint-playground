import {signal} from '@preact/signals'
import { ErrorAlert, Panel } from './ui'
import {BasicInfoPanel} from './BasicInfoPanel'
import {BlueprintInfoPanels} from './BlueprintInfoPanels'
import {ParametersPanel} from './ParametersPanel'
import { BlueprintTree } from './BlueprintTree'
import { RootJsonPanel } from './RootJsonPanel.tsx'
import { BlueprintSourceHandler } from './BlueprintSourceHandler'
import {deserializeBlueprint} from '../parsing/blueprintParser'
import {
    resetBlueprintTree,
    rootBlueprintSignal,
    selectedBlueprintPathSignal,
    selectedBlueprintSignal
} from '../state/blueprintTree'
import {SelectedJsonPanel} from "./SelectedJsonPanel.tsx";

// Local UI state signal
const errorSignal = signal<string | null>(null)

export function BlueprintPlayground() {
    const handleBlueprintPaste = async (value: string) => {
    // Guard against undefined/null value
    if (!value) {
        resetBlueprintTree()
        errorSignal.value = null
        return
    }

        // Handle empty input
        if (!value.trim()) {
            resetBlueprintTree()
            errorSignal.value = null
            return
        }


        try {
            errorSignal.value = null
            rootBlueprintSignal.value = deserializeBlueprint(value.trim())

            // Always select root with empty string path
            selectedBlueprintPathSignal.value = ""
        } catch (err: unknown) {
            console.error('Failed to parse blueprint:', err)
            if (err instanceof Error) {
                errorSignal.value = err.message
            } else {
                errorSignal.value = String(err)
            }
            resetBlueprintTree()
        }
    }

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <BlueprintSourceHandler onBlueprintString={handleBlueprintPaste} />
                <ErrorAlert error={errorSignal.value}/>
            </Panel>

            <div className="panels2">
                {/* Left side */}
                <div>
                    <RootJsonPanel
                        rootBlueprint={rootBlueprintSignal.value}
                    />
                    {rootBlueprintSignal.value?.blueprint_book && (
                        <Panel title="Blueprint Tree">
                            <BlueprintTree/>
                        </Panel>
                    )}
                </div>

                {/* Right side */}
                <div>
                    {selectedBlueprintSignal.value && (
                        <>
                            <SelectedJsonPanel
                                rootBlueprint={rootBlueprintSignal.value}
                                selectedBlueprint={selectedBlueprintSignal.value}
                                selectedPath={selectedBlueprintPathSignal.value}
                            />
                            <BasicInfoPanel blueprint={selectedBlueprintSignal.value}/>
                            <BlueprintInfoPanels blueprint={selectedBlueprintSignal.value}/>
                        </>
                    )}
                </div>
            </div>

            {/* Full-width parameters panel at bottom */}
            <ParametersPanel blueprintString={selectedBlueprintSignal.value}/>
        </div>
    )
}

export default BlueprintPlayground