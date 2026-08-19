import type {Meta, StoryObj} from '@storybook/react-vite';
import type {CSSProperties} from 'react';
import {expect, within} from 'storybook/test';

import {FactorioInventorySlot} from '../../ui/FactorioUi';
import {FactorioIcon, Placeholder} from './FactorioIcon';

const meta: Meta<typeof FactorioIcon> = {
	title: 'Core/FactorioIcon',
	component: FactorioIcon,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'radio',
			options: ['small', 'large'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof FactorioIcon>;

const highDensityIconStyle: CSSProperties & {'--factorio-ui-density': number} = {
	'--factorio-ui-density': 2,
};

export const ItemSmall: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
		},
		size: 'small',
	},
};

export const ItemLarge: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
		},
		size: 'large',
	},
};

export const Fluid: Story = {
	args: {
		icon: {
			type: 'fluid',
			name: 'water',
		},
		size: 'large',
	},
};

export const VirtualSignal: Story = {
	args: {
		icon: {
			type: 'virtual-signal',
			name: 'signal-A',
		},
		size: 'large',
	},
};

export const Entity: Story = {
	args: {
		icon: {
			type: 'entity',
			name: 'assembling-machine-3',
		},
		size: 'large',
	},
};

export const WithQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
			quality: 'legendary',
		},
		size: 'large',
	},
};

export const WithUncommonQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'copper-plate',
			quality: 'uncommon',
		},
		size: 'large',
	},
};

export const WithRareQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'steel-plate',
			quality: 'rare',
		},
		size: 'large',
	},
};

export const WithEpicQuality: Story = {
	args: {
		icon: {
			type: 'entity',
			name: 'electric-furnace',
			quality: 'epic',
		},
		size: 'large',
	},
};

export const NoIcon: Story = {
	args: {
		icon: undefined,
		size: 'large',
	},
};

export const IconPlaceholder: StoryObj<typeof Placeholder> = {
	render: () => <Placeholder size="large" />,
};

export const SlotAndRecordDensity: Story = {
	tags: ['visual-conformance'],
	render: () => (
		<main
			style={{
				display: 'grid',
				gap: 24,
				gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
				padding: 24,
			}}
		>
			<section aria-label="Inventory slot icons">
				<h2>Inventory slots</h2>
				<div style={{display: 'flex'}}>
					<FactorioInventorySlot aria-label="Legendary assembling machine">
						<FactorioIcon
							id="slot-large-icon"
							icon={{type: 'item', name: 'assembling-machine-3', quality: 'legendary'}}
							size="large"
						/>
					</FactorioInventorySlot>
					<FactorioInventorySlot aria-label="Normal assembling machine">
						<FactorioIcon
							id="slot-normal-icon"
							icon={{type: 'item', name: 'assembling-machine-3', quality: 'normal'}}
							size="large"
						/>
					</FactorioInventorySlot>
				</div>
			</section>
			<section aria-label="Inline icons">
				<h2>Inline sizes</h2>
				<FactorioIcon
					id="inline-small-icon"
					icon={{type: 'item', name: 'quality-module-3', quality: 'epic'}}
					size="small"
				/>
			</section>
			<section aria-label="Blueprint record icons">
				<h2>Record card</h2>
				<div className="blueprint-record-item blueprint-record-item--grid" style={{maxWidth: 180}}>
					<span className="blueprint-record-item__icons" aria-hidden="true">
						<FactorioIcon
							id="record-quality-icon"
							icon={{type: 'item', name: 'assembling-machine-3', quality: 'legendary'}}
							size="large"
						/>
						<FactorioIcon
							id="record-secondary-icon"
							icon={{type: 'item', name: 'transport-belt'}}
							size="large"
						/>
					</span>
					<span className="blueprint-record-item__text">
						<strong>Legendary factory</strong>
					</span>
				</div>
			</section>
			<section aria-label="High-density icon" style={highDensityIconStyle}>
				<h2>2× density</h2>
				<FactorioInventorySlot aria-label="Dense rare quality module">
					<FactorioIcon
						id="dense-icon"
						icon={{type: 'item', name: 'quality-module-3', quality: 'rare'}}
						size="large"
					/>
				</FactorioInventorySlot>
			</section>
		</main>
	),
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const assertIconGeometry = (iconId: string, expectedSize: number) => {
			const icon = canvasElement.querySelector<HTMLElement>(`#${iconId}`);
			if (icon === null) {
				throw new Error(`Missing ${iconId}.`);
			}
			const image = within(icon).getByTestId('icon');
			const badge = within(icon).getByTestId('quality');
			const iconBounds = icon.getBoundingClientRect();
			const imageBounds = image.getBoundingClientRect();
			const badgeBounds = badge.getBoundingClientRect();
			return {
				badgeBottom: iconBounds.bottom - badgeBounds.bottom,
				badgeLeft: badgeBounds.left - iconBounds.left,
				badgeRatio: badgeBounds.width / iconBounds.width,
				iconHeight: iconBounds.height,
				iconWidth: iconBounds.width,
				imageHeight: imageBounds.height,
				imageWidth: imageBounds.width,
				expectedSize,
			};
		};
		const large = assertIconGeometry('slot-large-icon', 32);
		const small = assertIconGeometry('inline-small-icon', 24);
		const dense = assertIconGeometry('dense-icon', 64);
		for (const geometry of [large, small, dense]) {
			await expect({
				badgeBottom: geometry.badgeBottom,
				badgeLeft: geometry.badgeLeft,
				iconHeight: geometry.iconHeight,
				iconWidth: geometry.iconWidth,
				imageHeight: geometry.imageHeight,
				imageWidth: geometry.imageWidth,
			}).toStrictEqual({
				badgeBottom: 0,
				badgeLeft: 0,
				iconHeight: geometry.expectedSize,
				iconWidth: geometry.expectedSize,
				imageHeight: geometry.expectedSize,
				imageWidth: geometry.expectedSize,
			});
			await expect(geometry.badgeRatio).toBeCloseTo(0.425, 2);
		}
		await expect(within(canvas.getByLabelText('Normal assembling machine')).queryByTestId('quality')).toBeNull();
		const images = [...canvasElement.querySelectorAll<HTMLImageElement>('img')];
		await Promise.all(images.map(async (image) => image.decode()));
		for (const image of images) {
			await expect({complete: image.complete, naturalWidth: image.naturalWidth > 0}).toStrictEqual({
				complete: true,
				naturalWidth: true,
			});
		}
	},
};
