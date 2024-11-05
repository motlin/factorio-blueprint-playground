import {signal} from '@preact/signals'
import {useNavigate, useSearch} from '@tanstack/react-router'
import {useEffect} from 'preact/hooks'
import type {JSX} from 'preact'
import type {RootSearchSchema} from '../routes/__root'

// Blueprint source configuration
interface SourceConfig {
    pattern: RegExp
    getUrl: (match: RegExpMatchArray) => string
    extractBlueprint: (data: any) => string
}

const SOURCES: Record<string, SourceConfig> = {
    'factorio.school': {
        pattern: /factorio\.school\/view\/([^\/\s]+)/,
        getUrl: (match) => `https://www.factorio.school/api/blueprint/${match[1]}`,
        extractBlueprint: (data) => data.blueprintString.blueprintString
    },
    'factorioprints.com': {
        pattern: /factorioprints\.com\/view\/([^\/\s]+)/,
        getUrl: (match) => `https://facorio-blueprints.firebaseio.com/blueprints/${match[1]}.json`,
        extractBlueprint: (data) => {
            if (!data || !data.blueprint) {
                throw new Error('Invalid blueprint data from Factorio Prints');
            }
            return data.blueprint;
        }
    },
}

// Signals for component state
const loadingSignal = signal(false)
const errorSignal = signal<string | null>(null)
const textValueSignal = signal('')

export interface BlueprintSourceHandlerProps {
    onBlueprintString: (value: string) => void
}

export const BlueprintSourceHandler = ({onBlueprintString}: BlueprintSourceHandlerProps) => {
    const search = useSearch({from: '/'}) as RootSearchSchema
    const navigate = useNavigate()

    // Handle direct blueprint string from URL
    useEffect(() => {
        if (search.data) {
            textValueSignal.value = search.data
            onBlueprintString(search.data)
        }
    }, [search.data])

    // Handle source URL parameter
    useEffect(() => {
        if (!search.source) return

        const fetchBlueprint = async () => {
            loadingSignal.value = true
            errorSignal.value = null
            try {
                const response = await fetch(decodeURIComponent(search.source!))
                if (!response.ok) {
                    throw new Error(`Failed to fetch blueprint: ${response.statusText}`)
                }
                const data = await response.json()
                const sourceType = search.source?.includes('factorio.school') ? 'factorio.school' : 'factorioprints.com'
                const blueprint = SOURCES[sourceType].extractBlueprint(data)

                // Guard against undefined/null blueprint
                if (!blueprint) {
                    throw new Error('Failed to extract blueprint data')
                }

                textValueSignal.value = blueprint
                onBlueprintString(blueprint)
            } catch (err) {
                errorSignal.value = err instanceof Error ? err.message : 'Failed to fetch blueprint'
            } finally {
                loadingSignal.value = false
            }
        }

        fetchBlueprint()
    }, [search.source])

    // Handle text input changes
    const handleChange = (e: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => {
        const target = e.target as HTMLTextAreaElement
        const value = target.value
        textValueSignal.value = value

        // Check if the input matches any source patterns
        for (const [_, config] of Object.entries(SOURCES)) {
            const match = value.match(config.pattern)
            if (match) {
                // Update URL to use source parameter
                navigate({
                    to: '/',
                    search: (prev) => ({
                        ...prev,
                        source: encodeURIComponent(config.getUrl(match)),
                        data: undefined
                    })
                })
                return
            }
        }

        // If it's not a source URL, treat it as a blueprint string
        if (value) {
            navigate({
                to: '/',
                search: (prev) => ({
                    ...prev,
                    data: value,
                    source: undefined
                })
            })
        } else {
            navigate({
                to: '/',
                search: (prev) => ({
                    ...prev,
                    data: undefined,
                    source: undefined
                })
            })
        }

        onBlueprintString(value)
    }

    return (
        <div>
            <textarea
                placeholder="Paste your blueprint here..."
                onChange={handleChange}
                value={textValueSignal.value}
                rows={3}
                className="w100p"
                disabled={loadingSignal.value}
            />
            {loadingSignal.value && <div className="mt16">Loading blueprint...</div>}
            {errorSignal.value && (
                <div className="panel alert alert-error mt16">{errorSignal.value}</div>
            )}
        </div>
    )
}