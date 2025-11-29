import {memo} from 'react';

import type {Quality, SignalType} from '../../../../parsing/types';
import {Panel} from '../../../ui';
import {IconCell, Row, Spreadsheet, TextCell} from '../../spreadsheet';

import {mapToSortedArray} from './countUtils';

interface ItemPanelProps {
	title: string;
	items: Map<string, number>;
	type: SignalType;
}

const ItemPanelComponent = ({title, items, type}: ItemPanelProps) => {
	if (!items.size) return null;

	const sortedItems: {name: string; quality: Quality; count: number}[] = mapToSortedArray(items);

	return (
		<Panel title={title}>
			<Spreadsheet>
				{sortedItems.map(({name, quality, count}) => (
					<Row key={JSON.stringify({type, name, quality})}>
						<IconCell icon={{type, name, quality}} />
						<TextCell grow>{name}</TextCell>
						<TextCell
							width="80px"
							align="right"
							grow={false}
						>
							{count}
						</TextCell>
					</Row>
				))}
			</Spreadsheet>
		</Panel>
	);
};

ItemPanelComponent.displayName = 'ItemPanel';
export const ItemPanel = memo(ItemPanelComponent);
