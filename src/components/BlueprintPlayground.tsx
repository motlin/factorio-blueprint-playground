import {useState} from 'react'
import {createLazyFileRoute} from '@tanstack/react-router'
import {deserializeBlueprint} from '../parsing/blueprintParser'
import {addBlueprint} from '../state/blueprint'
import type {DatabaseBlueprintType} from '../storage/blueprints'
import {Background, ErrorAlert, Panel, Textarea} from "./ui";

function getBlueprintType(data: any): DatabaseBlueprintType {
    if (data.blueprint) return 'blueprint'
    if (data.blueprint_book) return 'blueprint_book'
    if (data.upgrade_planner) return 'upgrade_planner'
    if (data.deconstruction_planner) return 'deconstruction_planner'
    throw new Error('Invalid blueprint type')
}

function BlueprintPlayground() {
    const [error, setError] = useState<string | null>(null)

    const handleBlueprintPaste = async (value: string) => {
        try {
            setError(null)
            const parsed = deserializeBlueprint(value.trim())

            // Get the content based on type
            const type = getBlueprintType(parsed)
            const content = parsed[type]

            // Extract metadata
            const blueprint = await addBlueprint(value, {
                type,
                label: content.label,
                description: content.description,
                gameVersion: content.version.toString(),
                icons: (content.icons || []).map(icon => ({
                    type: icon.signal.type,
                    name: icon.signal.name
                })),
                usesSpaceAge: false, // TODO: Implement detection
                usesQuality: false,  // TODO: Implement detection
                usesElevatedRails: false // TODO: Implement detection
            })

            console.log('Parsed blueprint:', blueprint)
        } catch (err) {
            console.error('Failed to parse blueprint:', err)
            setError(err.message)
        }
    }

    return (
        <div className="container">
            <h1 style={{
                color: '#ffe6c0',
                fontSize: '130%',
                fontWeight: 'bold',
                marginBottom: '12px'
            }}>
                Factorio Blueprint Playground
            </h1>

            <Panel>
                <Textarea
                    placeholder="Paste your blueprint here..."
                    onChange={handleBlueprintPaste}
                    value=""
                    rows={3}
                />
                <ErrorAlert error={error} />
            </Panel>
        </div>
    )
}

export const Route = createLazyFileRoute('/')({
    component: BlueprintPlayground
})