import React from 'react';

import {BlueprintWrapper} from '../../../parsing/BlueprintWrapper';
import {Icon} from '../../../parsing/types';
import {FactorioIcon, Placeholder} from '../../core/icons/FactorioIcon';
import {RichText} from '../../core/text/RichText';

import {TreeNode} from './types';

export interface TreeRowProps {
	node: TreeNode;
	indentLevel: number;
	isSelected: boolean;
	isActive: boolean;
	onSelect: (path: string) => void;
}

export const TreeRow = ({node, indentLevel, isSelected, isActive, onSelect}: TreeRowProps) => {
	const wrapper = new BlueprintWrapper(node.blueprint);

	function getIconElement(index: number) {
		const icon: Icon | undefined = wrapper.getIcons()?.find((icon) => icon.index === index);
		if (icon) {
			return (
				<FactorioIcon
					key={index}
					icon={icon.signal}
					size={'small'}
				/>
			);
		}
		return (
			<Placeholder
				key={index}
				size={'small'}
			/>
		);
	}

	const classes = ['tree-row flex clickable', isSelected ? 'selected' : '', isActive ? 'active' : '']
		.filter(Boolean)
		.join(' ');

	const indentPx = (indentLevel * 32).toString();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		onSelect(node.path);
	};

	return (
		<div
			className={classes}
			style={{
				paddingLeft: `${indentPx}px`,
			}}
			onClick={handleClick}
			tabIndex={0}
		>
			<div className="flex flex-items-center">
				<FactorioIcon
					icon={{type: 'item', name: wrapper.getType()}}
					size={'small'}
				/>
				<div className="separator" />
			</div>

			<div className="flex flex-items-center">
				{[1, 2, 3, 4].map((index) => getIconElement(index))}
				<div className="separator" />
			</div>

			<div className="label">
				<RichText
					text={wrapper.getLabel()}
					iconSize={'small'}
				/>
			</div>
		</div>
	);
};
