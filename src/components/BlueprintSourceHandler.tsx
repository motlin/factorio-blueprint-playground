import {signal} from '@preact/signals'
import {useNavigate, useSearch} from '@tanstack/react-router'
import { useEffect, useRef } from 'preact/hooks'
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
            if (!data?.blueprintString) {
                throw new Error('Invalid blueprint data from Factorio Prints')
            }
            return data.blueprintString
        }
    },
}

type ValidationState =
    | { status: 'initial' }
    | { status: 'testing_url' }
    | { status: 'fetching_url', url: string }
    | { status: 'testing_blueprint' }
    | { status: 'error', message: string }

// Using a ref for the validation ID ensures we can abandon outdated operations
let validationId = 0

export interface BlueprintSourceHandlerProps {
    onBlueprintString: (value: string) => void
}

// Move signals outside component so they persist
const textValueSignal = signal('')
const originalInputSignal = signal('') // New signal to track original input
const validationStateSignal = signal<ValidationState>({ status: 'initial' })

export const BlueprintSourceHandler = ({onBlueprintString}: BlueprintSourceHandlerProps) => {
    const search = useSearch({from: '/'}) as RootSearchSchema
    const navigate = useNavigate()
    const currentValidationId = useRef(0)

    const fetchBlueprint = async (sourceUrl: string) => {
            const thisValidationId = ++validationId
            currentValidationId.current = thisValidationId

            try {
            const displayUrl = decodeURIComponent(sourceUrl)
            let foundConfig: SourceConfig | null = null
            let foundMatch: RegExpMatchArray | null = null

            // Find matching source config
            for (const config of Object.values(SOURCES)) {
                const match = displayUrl.match(config.pattern)
                if (match) {
                    foundConfig = config
                    foundMatch = match
                    break
                }
            }

            if (!foundConfig || !foundMatch) {
                throw new Error('Invalid blueprint URL')
            }

        originalInputSignal.value = displayUrl

                validationStateSignal.value = { status: 'fetching_url', url: displayUrl }

            const response = await fetch(foundConfig.apiUrl(foundMatch))
                if (!response.ok) {
                    throw new Error(`Failed to fetch blueprint: ${response.statusText}`)
                }

                if (currentValidationId.current !== thisValidationId) return

                const data = await response.json()
            const blueprint = foundConfig.extractBlueprint(data)

                if (!blueprint) {
                    throw new Error('Failed to extract blueprint data')
                }

                // Final validation
                validationStateSignal.value = { status: 'testing_blueprint' }
                deserializeBlueprint(blueprint) // Will throw if invalid

        // Set state and trigger callback but keep the source URL
                validationStateSignal.value = { status: 'initial' }
                textValueSignal.value = blueprint
                onBlueprintString(blueprint)

        // Don't update URL - keep the source parameter
            } catch (err) {
                if (currentValidationId.current !== thisValidationId) return
                validationStateSignal.value = {
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Failed to fetch blueprint'
                }
                // Clear the URL on error
                navigate({
                    to: '/',
                    search: (prev) => ({ ...prev, source: undefined, data: undefined }),
                    replace: true
                })
            }
        }

    // Handle source URL parameter
    useEffect(() => {
        if (!search.source) return
        fetchBlueprint(search.source)
    }, [search.source])

    const validateInput = async (value: string) => {
        const thisValidationId = ++validationId
        currentValidationId.current = thisValidationId

        // Store the original input right away
        originalInputSignal.value = value

        // Empty input - reset to initial state
        if (!value.trim()) {
            validationStateSignal.value = { status: 'initial' }
            onBlueprintString('')
        // Clear URL parameters
        navigate({
            to: '/',
            search: (prev) => ({ ...prev, source: undefined, data: undefined }),
            replace: true
        })
            return
        }

        // First check for URLs
        validationStateSignal.value = { status: 'testing_url' }
        for (const config of Object.values(SOURCES)) {
            const match = value.match(config.pattern)
            if (match) {
            const encodedUrl = encodeURIComponent(config.displayUrl(match))
            // Only update URL if it's different from current search params
            if (search.source !== encodedUrl) {
                navigate({
                    to: '/',
                    search: (prev) => ({
                        ...prev,
                        source: encodedUrl,
                        data: undefined
                    }),
                    replace: true
                })
            } else {
                // If URL is the same, trigger fetch directly
                    await fetchBlueprint(encodedUrl)
            }
                return
            }
        }

        // If we get here, test as blueprint
        validationStateSignal.value = { status: 'testing_blueprint' }
        try {
            deserializeBlueprint(value)

            // Update URL to match what was originally pasted
            navigate({
                to: '/',
                search: {
                    data: originalInputSignal.value,
                    source: undefined
                },
                replace: true
            })

            validationStateSignal.value = { status: 'initial' }
            onBlueprintString(value)
        } catch (err) {
            if (currentValidationId.current !== thisValidationId) return
            validationStateSignal.value = {
                status: 'error',
                message: err instanceof Error ? err.message : 'Invalid blueprint format'
            }
        }
    }

    const handleChange = async (e: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => {
        const value = (e.target as HTMLTextAreaElement).value
        const prevValue = textValueSignal.value
        textValueSignal.value = value

        // Reset validation state even if value hasn't changed
        validationStateSignal.value = { status: 'initial' }

        // Don't revalidate if just updating to match the value we already processed
        if (value !== prevValue) {
            await validateInput(value)
        }
    }

    // Render status message based on state
    const renderStatus = () => {
        const state = validationStateSignal.value
        let message = ''
        let isError = false

        switch (state.status) {
            case 'initial':
                return null
            case 'testing_url':
                message = 'Checking if input is a blueprint URL...'
                break
            case 'fetching_url':
                message = 'Fetching blueprint from URL...'
                break
            case 'testing_blueprint':
                message = 'Validating blueprint format...'
                break
            case 'error':
                message = state.message
                isError = true
                break
        }

        return (
            <div className={`status-message ${isError ? 'error' : ''}`} style={{ minHeight: '2em' }}>
                {message}
            </div>
        )
    }

    const handleFocus = (e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.select();
    };

    return (
        <div>
            <textarea
                placeholder="Paste blueprint or url here..."
                onChange={handleChange}
            onFocus={handleFocus}
                value={textValueSignal.value}
                rows={3}
                className="w100p"
                disabled={validationStateSignal.value.status !== 'initial' &&
                    validationStateSignal.value.status !== 'error'}
            />
            {renderStatus()}
        </div>
    )
}

export default BlueprintSourceHandler