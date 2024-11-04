// src/parsing/BlueprintWrapper.ts
import type { BlueprintString, Blueprint, BlueprintBook, UpgradePlanner, DeconstructionPlanner, Icon } from './types'

export interface BlueprintInfo {
    type: 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner'
    content: Blueprint | BlueprintBook | UpgradePlanner | DeconstructionPlanner
    label: string | undefined
    description: string | undefined
    icons: Icon[]
    version: number
}

export class BlueprintWrapper {
    private data: BlueprintString;

    constructor(blueprint: BlueprintString) {
        this.data = blueprint;
    }

    getInfo(): BlueprintInfo {
        const type = this.getType();
        const content = this.getContent();

        // Get icons with special handling for planners
        let icons: Icon[] = [];
        if (this.data.upgrade_planner?.settings?.icons) {
            icons = this.data.upgrade_planner.settings.icons;
        } else if (this.data.deconstruction_planner?.settings?.icons) {
            icons = this.data.deconstruction_planner.settings.icons;
        } else {
            icons = content.icons || [];
        }

        // Get description with special handling for planners
        let description: string | undefined;
        if (this.data.upgrade_planner?.settings?.description) {
            description = this.data.upgrade_planner.settings.description;
        } else if (this.data.deconstruction_planner?.settings?.description) {
            description = this.data.deconstruction_planner.settings.description;
        } else {
            description = content.description;
        }

        return {
            type,
            content,
            label: content.label,
            description,
            icons,
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
        return this.getContent().description;
    }

    getIcons(): BlueprintInfo['icons'] {
        const content = this.getContent();
        if (this.data.upgrade_planner?.settings?.icons) {
            return this.data.upgrade_planner.settings.icons;
        }
        if (this.data.deconstruction_planner?.settings?.icons) {
            return this.data.deconstruction_planner.settings.icons;
        }
        return content.icons || [];
    }

    getVersion(): number {
        return this.getContent().version;
    }

    getRawData(): BlueprintString {
        return this.data;
    }
}