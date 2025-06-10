// src/parsing/BlueprintWrapper.ts
import type {Blueprint, BlueprintBook, BlueprintString, DeconstructionPlanner, Icon, UpgradePlanner} from './types';

export interface BlueprintInfo {
	type: 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner';
	content: Blueprint | BlueprintBook | UpgradePlanner | DeconstructionPlanner;
	label?: string;
	description?: string;
	icons?: Icon[];
	version: number;
}

export class BlueprintWrapper {
	private data: BlueprintString;

	constructor(blueprint: BlueprintString) {
		// Deep copy to avoid mutating the original
		this.data = JSON.parse(JSON.stringify(blueprint)) as BlueprintString;
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

	/**
	 * Gets the raw blueprint object for storage
	 */
	getRawBlueprint(): BlueprintString {
		return this.data;
	}

	/**
	 * Updates the label of the blueprint
	 * @param newLabel The new label to set
	 * @returns True if label was updated, false otherwise
	 */
	updateLabel(newLabel: string): boolean {
		try {
			if (this.data.blueprint) {
				this.data.blueprint.label = newLabel;
				return true;
			}
			if (this.data.blueprint_book) {
				this.data.blueprint_book.label = newLabel;
				return true;
			}
			if (this.data.upgrade_planner) {
				this.data.upgrade_planner.label = newLabel;
				return true;
			}
			if (this.data.deconstruction_planner) {
				this.data.deconstruction_planner.label = newLabel;
				return true;
			}
			return false;
		} catch (error) {
			console.error('Error updating label:', error);
			return false;
		}
	}

	/**
	 * Updates the description of the blueprint
	 * @param newDescription The new description to set
	 * @returns True if description was updated, false otherwise
	 */
	updateDescription(newDescription: string): boolean {
		try {
			if (this.data.blueprint) {
				this.data.blueprint.description = newDescription;
				return true;
			}
			if (this.data.blueprint_book) {
				this.data.blueprint_book.description = newDescription;
				return true;
			}
			if (this.data.upgrade_planner) {
				if (!this.data.upgrade_planner.settings) {
					this.data.upgrade_planner.settings = {};
				}
				this.data.upgrade_planner.settings.description = newDescription;
				return true;
			}
			if (this.data.deconstruction_planner) {
				if (!this.data.deconstruction_planner.settings) {
					this.data.deconstruction_planner.settings = {};
				}
				this.data.deconstruction_planner.settings.description = newDescription;
				return true;
			}
			return false;
		} catch (error) {
			console.error('Error updating description:', error);
			return false;
		}
	}

	/**
	 * Converts the blueprint to a string representation
	 * @returns Blueprint as a string
	 */
	toString(): string {
		return JSON.stringify(this.data);
	}
}
