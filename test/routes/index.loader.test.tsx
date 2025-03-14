/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, expect, test, vi, beforeEach} from 'vitest';

import {fetchBlueprint} from '../../src/fetching/blueprintFetcher';
import {BlueprintWrapper} from '../../src/parsing/BlueprintWrapper';
import {extractBlueprint} from '../../src/parsing/blueprintParser';
import * as IndexRoute from '../../src/routes/index';
import {addBlueprint} from '../../src/state/blueprintLocalStorage';

// Extract loader function directly
const loader = IndexRoute.Route.options.loader;

// Mock dependencies
vi.mock('../../src/fetching/blueprintFetcher');
vi.mock('../../src/parsing/BlueprintWrapper');
vi.mock('../../src/state/blueprintLocalStorage');
vi.mock('../../src/parsing/blueprintParser', () => ({
    extractBlueprint: vi.fn(),
}));

describe('Index route loader', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    test('calls fetchBlueprint with pasted value', async () => {
        // Setup
        const mockFetchBlueprint = vi.mocked(fetchBlueprint);
        mockFetchBlueprint.mockResolvedValue({
            success: false,
            error: new Error('Test error'),
            pasted: 'test',
        });

        // Execute
        const result = await loader({
            context: {},
            params: {},
            search: {pasted: 'test'},
            location: {} as any,
            abortController: new AbortController(),
            deps: {pasted: 'test'},
        });

        // Verify
        expect(mockFetchBlueprint).toHaveBeenCalledWith({pasted: 'test'});
        expect(result).toEqual({
            success: false,
            error: new Error('Test error'),
            pasted: 'test',
        });
    });

    test('saves blueprint to history on success', async () => {
        // Setup
        const mockFetchBlueprint = vi.mocked(fetchBlueprint);
        const mockBlueprintWrapper = vi.mocked(BlueprintWrapper);
        const mockAddBlueprint = vi.mocked(addBlueprint);

        const mockBlueprint = {
            blueprint: {
                label: 'Test Blueprint',
                description: 'Test Description',
                version: 123456,
                icons: [{signal: {type: 'item', name: 'test-icon'}}],
            },
        };

        mockFetchBlueprint.mockResolvedValue({
            success: true,
            blueprintString: mockBlueprint,
            pasted: 'test',
        });

        // Mock BlueprintWrapper instance methods
        const mockGetType = vi.fn().mockReturnValue('blueprint');
        const mockGetContent = vi.fn().mockReturnValue({
            label: 'Test Blueprint',
            description: 'Test Description',
            version: 123456,
            icons: [{signal: {type: 'item', name: 'test-icon'}}],
        });

        mockBlueprintWrapper.prototype.getType = mockGetType;
        mockBlueprintWrapper.prototype.getContent = mockGetContent;

        // Execute
        await loader({
            context: {},
            params: {},
            search: {pasted: 'test'},
            location: {} as any,
            abortController: new AbortController(),
            deps: {pasted: 'test'},
        });

        // Verify
        expect(mockAddBlueprint).toHaveBeenCalledWith(
            'test',
            expect.objectContaining({
                type: 'blueprint',
                label: 'Test Blueprint',
                description: 'Test Description',
            }),
            undefined,
        );
    });
    
    test('saves valid selection path to history', async () => {
        // Setup
        const mockFetchBlueprint = vi.mocked(fetchBlueprint);
        const mockBlueprintWrapper = vi.mocked(BlueprintWrapper);
        const mockAddBlueprint = vi.mocked(addBlueprint);
        const mockExtractBlueprint = vi.mocked(extractBlueprint);

        // Return a valid blueprint when extracting the path
        mockExtractBlueprint.mockReturnValue({
            blueprint: {
                label: 'Nested Blueprint',
                version: 123456,
                item: 'blueprint',
            },
        });

        const mockBlueprint = {
            blueprint_book: {
                label: 'Test Book',
                version: 123456,
                item: 'blueprint-book',
                blueprints: [
                    { blueprint: { label: 'Nested Blueprint', version: 123456, item: 'blueprint' } },
                ],
            },
        };

        mockFetchBlueprint.mockResolvedValue({
            success: true,
            blueprintString: mockBlueprint,
            pasted: 'test',
        });

        // Mock BlueprintWrapper instance methods
        const mockGetType = vi.fn().mockReturnValue('blueprint-book');
        const mockGetContent = vi.fn().mockReturnValue({
            label: 'Test Book',
            version: 123456,
            blueprints: [
                { blueprint: { label: 'Nested Blueprint', version: 123456, item: 'blueprint' } },
            ],
        });

        mockBlueprintWrapper.prototype.getType = mockGetType;
        mockBlueprintWrapper.prototype.getContent = mockGetContent;

        // Execute
        await loader({
            context: {},
            params: {},
            search: {pasted: 'test', selection: '1'},
            location: {} as any,
            abortController: new AbortController(),
            deps: {pasted: 'test'},
        });

        // Verify extraction was attempted
        expect(mockExtractBlueprint).toHaveBeenCalledWith(mockBlueprint, '1');
        
        // Verify valid selection was saved
        expect(mockAddBlueprint).toHaveBeenCalledWith(
            'test',
            expect.any(Object),
            '1',
        );
    });

    test('validates and discards invalid selection path', async () => {
        // Setup
        const mockFetchBlueprint = vi.mocked(fetchBlueprint);
        const mockBlueprintWrapper = vi.mocked(BlueprintWrapper);
        const mockAddBlueprint = vi.mocked(addBlueprint);
        const mockExtractBlueprint = vi.mocked(extractBlueprint);

        // Throw error when extracting with invalid path
        mockExtractBlueprint.mockImplementation(() => {
            throw new Error('Invalid path 6.1: no blueprint book at 6.1');
        });

        const mockBlueprint = {
            blueprint: {
                label: 'Simple Blueprint',
                version: 123456,
                item: 'blueprint',
            },
        };

        mockFetchBlueprint.mockResolvedValue({
            success: true,
            blueprintString: mockBlueprint,
            pasted: 'test',
        });

        // Mock BlueprintWrapper instance methods
        const mockGetType = vi.fn().mockReturnValue('blueprint');
        const mockGetContent = vi.fn().mockReturnValue({
            label: 'Simple Blueprint',
            version: 123456,
        });

        mockBlueprintWrapper.prototype.getType = mockGetType;
        mockBlueprintWrapper.prototype.getContent = mockGetContent;

        // Execute
        await loader({
            context: {},
            params: {},
            search: {pasted: 'test', selection: '6.1'}, // Invalid path for a simple blueprint
            location: {} as any,
            abortController: new AbortController(),
            deps: {pasted: 'test'},
        });

        // Verify extraction was attempted
        expect(mockExtractBlueprint).toHaveBeenCalledWith(mockBlueprint, '6.1');
        
        // Verify selection was NOT saved (undefined instead of '6.1')
        expect(mockAddBlueprint).toHaveBeenCalledWith(
            'test',
            expect.any(Object),
            undefined,
        );
    });
});
