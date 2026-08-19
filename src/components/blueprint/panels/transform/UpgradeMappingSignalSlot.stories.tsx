import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fireEvent, fn, userEvent, within} from 'storybook/test';

import {transformStoryParameters} from './transformStoryParameters';
import {SignalSlot} from './UpgradeMappingRow';

function slotImages(canvasElement: HTMLElement): string[] {
	return [...canvasElement.querySelectorAll('img')].map((image) => image.getAttribute('src') ?? '');
}

function conditionText(canvasElement: HTMLElement): string | undefined {
	return canvasElement.querySelector('.transform-signal-slot__comparator')?.textContent ?? undefined;
}

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradeMappingSignalSlot',
	component: SignalSlot,
	args: {
		label: 'Choose source for mapping',
		onChoose: fn(),
		onClear: fn(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof SignalSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: {onClear: undefined},
	play: async ({canvasElement}) => {
		const slot = within(canvasElement).getByRole('button', {name: 'Choose source for mapping'});
		await expect({
			className: slot.className,
			images: slotImages(canvasElement),
			tooltip: slot.getAttribute('title'),
		}).toStrictEqual({
			className: 'factorio-inventory-slot transform-signal-slot transform-signal-slot--empty',
			images: [],
			tooltip: null,
		});
	},
};

export const EntitySourceAnyQuality: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Transport belt',
		signal: {type: 'entity', name: 'transport-belt'},
	},
	play: async ({canvasElement}) => {
		await expect({
			comparator: conditionText(canvasElement),
			images: slotImages(canvasElement),
		}).toStrictEqual({
			comparator: undefined,
			images: [
				'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
				'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp',
			],
		});
	},
};

export const ModuleItemSource: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Speed module',
		signal: {type: 'item', name: 'speed-module'},
	},
	play: async ({canvasElement}) => {
		await expect(slotImages(canvasElement)).toStrictEqual([
			'https://factorio-icon-cdn.pages.dev/item/speed-module.webp',
			'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp',
		]);
	},
};

export const SourceComparatorCondition: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Assembling machine 2',
		signal: {type: 'entity', name: 'assembling-machine-2', quality: 'rare', comparator: '≤'},
	},
	play: async ({canvasElement}) => {
		const overlay = canvasElement.querySelector('.transform-signal-slot__condition');
		if (overlay === null) {
			throw new Error('Expected a quality-condition overlay.');
		}
		const overlayBounds = overlay.getBoundingClientRect();
		const badge = overlay.querySelector('img');
		if (badge === null) {
			throw new Error('Expected a quality badge in the condition overlay.');
		}
		const comparatorElement = overlay.querySelector('.transform-signal-slot__comparator');
		if (comparatorElement === null) {
			throw new Error('Expected a comparator in the condition overlay.');
		}
		const comparatorBounds = comparatorElement.getBoundingClientRect();
		const badgeBounds = badge.getBoundingClientRect();
		await expect({
			badgeRightOfComparator: badgeBounds.left >= comparatorBounds.right,
			bottomAnchored: Math.round(overlayBounds.bottom - badgeBounds.bottom) === 0,
			comparator: conditionText(canvasElement),
			images: slotImages(canvasElement),
			leftAnchored: Math.round(comparatorBounds.left - overlayBounds.left) === 0,
		}).toStrictEqual({
			badgeRightOfComparator: true,
			bottomAnchored: true,
			comparator: '≤',
			images: [
				'https://factorio-icon-cdn.pages.dev/entity/assembling-machine-2.webp',
				'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			],
			leftAnchored: true,
		});
	},
};

export const SourceExactQuality: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Assembling machine 2',
		signal: {type: 'entity', name: 'assembling-machine-2', quality: 'rare'},
	},
	play: async ({canvasElement}) => {
		await expect({
			comparator: conditionText(canvasElement),
			images: slotImages(canvasElement),
		}).toStrictEqual({
			comparator: undefined,
			images: [
				'https://factorio-icon-cdn.pages.dev/entity/assembling-machine-2.webp',
				'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			],
		});
	},
};

export const SourceNormalQuality: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Assembling machine 2',
		signal: {type: 'entity', name: 'assembling-machine-2', quality: 'normal'},
	},
	play: async ({canvasElement}) => {
		await expect({
			comparator: conditionText(canvasElement),
			images: slotImages(canvasElement),
		}).toStrictEqual({
			comparator: undefined,
			images: ['https://factorio-icon-cdn.pages.dev/entity/assembling-machine-2.webp'],
		});
	},
};

export const TargetQuality: Story = {
	args: {
		label: 'Choose target, currently Fast transport belt',
		signal: {type: 'entity', name: 'fast-transport-belt', quality: 'rare'},
	},
	play: async ({canvasElement}) => {
		await expect({
			conditionOverlay: canvasElement.querySelector('.transform-signal-slot__condition'),
			images: slotImages(canvasElement),
			qualityBadge: canvasElement.querySelector('img[data-testid="quality"]')?.getAttribute('src'),
		}).toStrictEqual({
			conditionOverlay: null,
			images: [
				'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
				'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			],
			qualityBadge: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
		});
	},
};

export const ClearInteractions: Story = {
	args: {
		condition: true,
		label: 'Choose source, currently Transport belt',
		signal: {type: 'entity', name: 'transport-belt'},
	},
	play: async ({args, canvasElement}) => {
		const slot = within(canvasElement).getByRole('button', {name: 'Choose source, currently Transport belt'});
		await userEvent.click(slot);
		await expect(args.onChoose).toHaveBeenCalledTimes(1);
		await fireEvent.contextMenu(slot);
		await expect(args.onClear).toHaveBeenCalledTimes(1);
		slot.focus();
		await userEvent.keyboard('{Delete}');
		await expect(args.onClear).toHaveBeenCalledTimes(2);
	},
};
