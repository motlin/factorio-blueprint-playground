import {signal} from '@preact/signals'
import {ErrorAlert, Panel} from "./ui"
import {BasicInfoPanel} from './BasicInfoPanel'
import {BlueprintInfoPanels} from './BlueprintInfoPanels'
import {ParametersPanel} from './ParametersPanel'
import BlueprintTree from './BlueprintTree'
import {deserializeBlueprint} from '../parsing/blueprintParser'
import {
    resetBlueprintTree,
    rootBlueprintSignal,
    selectedBlueprintPathSignal,
    selectedBlueprintSignal
} from '../state/blueprintTree'
import {JsonPanel} from "./JsonPanel.tsx";

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

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        handleBlueprintPaste(target.value);
    };
    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <textarea
                    placeholder="Paste your blueprint here..."
                    onChange={handleTextareaChange}
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
                            <BlueprintTree/>
                        </Panel>
                    )}
                </div>

                {/* Right side */}
                <div>
                    {selectedBlueprintSignal.value && (
                        <>
                            <BasicInfoPanel blueprint={selectedBlueprintSignal.value}/>
                            <BlueprintInfoPanels blueprint={selectedBlueprintSignal.value}/>
                            <JsonPanel
                                rootBlueprint={rootBlueprintSignal.value}
                                selectedBlueprint={selectedBlueprintSignal.value}
                                selectedPath={selectedBlueprintPathSignal.value}
                            />
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