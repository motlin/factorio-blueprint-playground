import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/preact'
import { userEvent } from '@testing-library/user-event'
import { BlueprintPlayground } from '../../src/components/BlueprintPlayground'
import { readFixtureFile } from '../fixtures/utils'

describe('BlueprintPlayground CSS Classes', () => {
    it('uses the expected CSS classes when rendering a blueprint', async () => {
        // Create user event instance
        const user = userEvent.setup()

        // Read the blueprint from fixtures
        const blueprintString = readFixtureFile('txt/book.txt')
        expect(blueprintString).toBeTruthy()

        // Render the main component
        const { container } = render(<BlueprintPlayground />)

        // Find and paste into the textarea
        const textarea = screen.getByPlaceholderText('Paste your blueprint here...')
        await user.click(textarea)
        await user.paste(blueprintString)

        // Wait for UI to update and Basic Information panel to appear
        await waitFor(() => {
            // First check that there's no error shown
            const errorElements = screen.queryByText(/Failed to parse blueprint/i)
            if (errorElements) {
                const textContent: string = screen.getByText(/Failed to parse blueprint/i).textContent;
                throw new Error('Blueprint parsing failed: ' + textContent)
            }

            // Then look for successful render
            const panel = screen.getByText('Basic Information')
            expect(panel).toBeDefined()
        }, {
            timeout: 2000 // Give it a bit more time to process
        })

        function getAllClasses(element: Element): Set<string> {
            const classes = new Set<string>()

            // Get className directly
            if (element.className) {
                if (typeof element.className === 'string') {
                    element.className.split(/\s+/).forEach(cls => {
                        if (cls) classes.add(cls.trim())
                    })
                } else {
                    console.warn('Invalid className:', element.className)
                    console.warn('Element:', element.outerHTML)
                }
            }

            // Process children
            Array.from(element.children).forEach(child => {
                getAllClasses(child).forEach(cls => classes.add(cls))
            })

            return classes
        }

        // Get all unique classes used in the rendered UI
        const allClasses = getAllClasses(container)

        // Expected classes - maintain in alphabetical order
        const expectedClasses = new Set([
            'blueprint-tree',
            'clickable',
            'container',
            'factorio-icon',
            'flex',
            'flex-items-center',
            'label',
            'mt16',
            'panel',
            'panel-hole',
            'panel-inset',
            'panel-inset-lighter',
            'panels2',
            'placeholder',
            'richtext',
            'separator',
            'tree-row',
            'w100p'
        ])

        // Convert actual classes to array for easier debugging
        const actualClassesArray = Array.from(allClasses).sort()
        const expectedClassesArray = Array.from(expectedClasses).sort()

        // Find classes that are present but not expected
        const unexpectedClasses = actualClassesArray.filter(cls => !expectedClasses.has(cls))
        if (unexpectedClasses.length > 0) {
            console.warn('Unexpected classes found:', unexpectedClasses)
        }

        // Find expected classes that are missing
        const missingClasses = expectedClassesArray.filter(cls => !allClasses.has(cls))
        if (missingClasses.length > 0) {
            console.warn('Missing expected classes:', missingClasses)
        }

        // Assert the exact list matches
        expect(actualClassesArray).toEqual(expectedClassesArray)
    })
})