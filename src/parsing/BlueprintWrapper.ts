// src/parsing/BlueprintWrapper.ts
import type { BlueprintString, Blueprint, BlueprintBook, UpgradePlanner, DeconstructionPlanner, Icon } from './types';

export interface BlueprintInfo {
    type: 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner'
    content: Blueprint | BlueprintBook | UpgradePlanner | DeconstructionPlanner
    label?: string
    description?: string
    icons?: Icon[]
    version: number
}

export class BlueprintWrapper {
    private data: BlueprintString;

    constructor(blueprint: BlueprintString) {
        this.data = blueprint;
    }

    getInfo(): BlueprintInfo {
        const content = this.getContent();
        return {
            type: this.getType(),
            content,
            label: content.label,
            description: this.getDescription(),
            icons: this.getIcons(),
            version: content.version,
        };
    }

    getType(): BlueprintInfo['type'] {
        if (this.data.blueprint) return 'blueprint';
        if (this.data.blueprint_book) return 'blueprint-book';
        if (this.data.upgrade_planner) return 'upgrade-planner';
        if (this.data.deconstruction_planner) return 'deconstruction-planner';
        throw new Error('Invalid blueprint: no recognized type found');
    }

    getContent(): BlueprintInfo['content'] {
        if (this.data.blueprint) return this.data.blueprint;
        if (this.data.blueprint_book) return this.data.blueprint_book;
        if (this.data.upgrade_planner) return this.data.upgrade_planner;
        if (this.data.deconstruction_planner) return this.data.deconstruction_planner;
        throw new Error('Invalid blueprint: no content found');
    }

    getLabel(): BlueprintInfo['label'] {
        return this.getContent().label;
    }

    getDescription(): BlueprintInfo['description'] {
        if (this.data.blueprint) {
            return this.data.blueprint.description;
        }
        if (this.data.blueprint_book) {
            return this.data.blueprint_book.description;
        }
        if (this.data.upgrade_planner) {
            return this.data.upgrade_planner.settings.description;
        }
        if (this.data.deconstruction_planner) {
            return this.data.deconstruction_planner.settings.description;
        }
        throw new Error('Invalid blueprint: no content found');
    }

    getIcons(): Icon[] {
        if (this.data.blueprint) {
            return this.data.blueprint.icons ?? [];
        }
        if (this.data.blueprint_book) {
            return this.data.blueprint_book.icons ?? [];
        }
        if (this.data.upgrade_planner) {
            return this.data.upgrade_planner.settings?.icons ?? [];
        }
        if (this.data.deconstruction_planner) {
            return this.data.deconstruction_planner.settings?.icons ?? [];
        }
        throw new Error('Invalid blueprint: no content found');
    }

    getVersion(): number {
        return this.getContent().version;
    }

    getRawData(): BlueprintString {
        return this.data;
    }
}
