import {signal} from '@preact/signals'
import {useNavigate, useSearch} from '@tanstack/react-router'
import {useEffect} from 'preact/hooks'
import type {JSX} from 'preact'
import type {RootSearchSchema} from '../routes/__root'
import { deserializeBlueprint } from '../parsing/blueprintParser'

// Blueprint source configuration
interface SourceConfig {
    pattern: RegExp
    displayUrl: (match: RegExpMatchArray) => string
    apiUrl: (match: RegExpMatchArray) => string
    extractBlueprint: (data: any) => string
}

const SOURCES: Record<string, SourceConfig> = {
    'factorio.school': {
        pattern: /factorio\.school\/view\/([^\/\s]+)/,
        displayUrl: (match) => `https://www.factorio.school/view/${match[1]}`,
        apiUrl: (match) => `https://www.factorio.school/api/blueprint/${match[1]}`,
        extractBlueprint: (data) => data.blueprintString.blueprintString
    },
    'factorioprints.com': {
        pattern: /factorioprints\.com\/view\/([^\/\s]+)/,
        displayUrl: (match) => `https://factorioprints.com/view/${match[1]}`,
        apiUrl: (match) => `https://facorio-blueprints.firebaseio.com/blueprints/${match[1]}.json`,
        extractBlueprint: (data) => {
            if (!data || !data.blueprintString) {
                throw new Error('Invalid blueprint data from Factorio Prints');
            }
            return data.blueprintString;
        }
    },
}

// URL safe length limit (leaving room for other parameters)
const URL_SAFE_LENGTH = 2000;

// Get API URL from display URL
const getApiUrl = (displayUrl: string): string | null => {
    for (const config of Object.values(SOURCES)) {
        const match = displayUrl.match(config.pattern)
        if (match) {
            return config.apiUrl(match)
        }
    }
    return null
}

// Get source config from display URL
const getSourceConfig = (displayUrl: string): SourceConfig | null => {
    for (const config of Object.values(SOURCES)) {
        if (config.pattern.test(displayUrl)) {
            return config
        }
    }
    return null
}

// Check if a string is a valid blueprint
const isValidBlueprint = (value: string): boolean => {
    try {
        deserializeBlueprint(value)
        return true
    } catch (err) {
        return false
    }
}

// Signals for component state
const loadingSignal = signal(false)
const errorSignal = signal<string | null>(null)
const textValueSignal = signal('')
const lastFetchedSourceSignal = signal<string | undefined>(undefined);

export interface BlueprintSourceHandlerProps {
    onBlueprintString: (value: string) => void
}

export const BlueprintSourceHandler = ({onBlueprintString}: BlueprintSourceHandlerProps) => {
    const search = useSearch({from: '/'}) as RootSearchSchema
    const navigate = useNavigate()

    // Handle direct blueprint string from URL
    useEffect(() => {
        if (search.data && textValueSignal.value !== search.data) {
            textValueSignal.value = search.data
            onBlueprintString(search.data)
        }
    }, [search.data])

    // Handle source URL parameter
    useEffect(() => {
        if (!search.source) return
        if (search.source === lastFetchedSourceSignal.value) return

        const fetchBlueprint = async () => {
            loadingSignal.value = true
            errorSignal.value = null
            try {
                const displayUrl = decodeURIComponent(search.source!)
                const apiUrl = getApiUrl(displayUrl)
                const sourceConfig = getSourceConfig(displayUrl)

                if (!apiUrl || !sourceConfig) {
                    throw new Error('Invalid blueprint URL')
                }

                lastFetchedSourceSignal.value = search.source || undefined;
                const response = await fetch(apiUrl)
                if (!response.ok) {
                    throw new Error(`Failed to fetch blueprint: ${response.statusText}`)
                }

                const data = await response.json()
                const blueprint = sourceConfig.extractBlueprint(data)

                // Guard against undefined/null blueprint
                if (!blueprint) {
                    throw new Error('Failed to extract blueprint data')
                }

                // Validate the blueprint
                if (!isValidBlueprint(blueprint)) {
                    throw new Error('Invalid blueprint format')
                }

                textValueSignal.value = blueprint
                onBlueprintString(blueprint)
            } catch (err) {
                errorSignal.value = err instanceof Error ? err.message : 'Failed to fetch blueprint'
                // Clear the URL on error
                navigate({
                    to: '/',
                    search: (prev) => ({ ...prev, source: undefined, data: undefined }),
                    replace: true
                })
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

        // If input is empty, clear URL params
        if (!value) {
            navigate({
                to: '/',
                search: (prev) => ({ ...prev, source: undefined, data: undefined }),
                replace: true
            })
            onBlueprintString('')
            return
        }

        // Check if the input matches any source patterns
        for (const [_, config] of Object.entries(SOURCES)) {
            const match = value.match(config.pattern)
            if (match) {
                // Update URL to use source parameter with the display URL
                navigate({
                    to: '/',
                    search: (prev) => ({
                        ...prev,
                        source: encodeURIComponent(config.displayUrl(match)),
                        data: undefined
                    })
                })
                return
            }
        }

        // If it's a valid blueprint string and under URL length limit, update URL
        if (isValidBlueprint(value) && value.length < URL_SAFE_LENGTH) {
            navigate({
                to: '/',
                search: (prev) => ({
                    ...prev,
                    data: value,
                    source: undefined
                })
            })
        } else {
            // Clear URL params for invalid/long data
            navigate({
                to: '/',
                search: (prev) => ({
                    ...prev,
                    source: undefined,
                    data: undefined
                }),
                replace: true
            })
        }

        onBlueprintString(value)
    }

    return (
        <div>
            <textarea
                placeholder="Paste blueprint or url here..."
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