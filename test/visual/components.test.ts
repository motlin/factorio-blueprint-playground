import { describe, it } from 'vitest';
import { render } from '@testing-library/preact';
import { BasicInfoPanel } from '../../src/components/BasicInfoPanel';
import { BlueprintTree } from '../../src/components/BlueprintTree';

describe('Visual regression tests', () => {
    it('BasicInfoPanel renders consistently', async () => {
        const mockBlueprint = {
            blueprint: {
                item: 'blueprint',
                version: 281479275675648,
                label: 'Test Blueprint',
                description: 'Test description with [item=iron-plate] and [color=red]colored text[/color]',
                icons: [
                    {
                        signal: { type: 'item', name: 'iron-plate' },
                        index: 1
                    }
                ]
            }
        };

        render(<BasicInfoPanel blueprint={mockBlueprint} />);
        await compareScreenshots('basic-info-panel', '.panel');
    });

    it('BlueprintTree renders consistently', async () => {
        const mockBlueprint = {
            blueprint_book: {
                item: 'blueprint-book',
                version: 281479275675648,
                blueprints: [
                    {
                        blueprint: {
                            item: 'blueprint',
                            label: 'First Blueprint',
                            icons: [{ signal: { type: 'item', name: 'iron-plate' }, index: 1 }]
                        }
                    }
                ]
            }
        };

        render(<BlueprintTree />);
        await compareScreenshots('blueprint-tree', '.blueprint-tree');
    });
});