import type {ReactNode} from 'react';
import {memo} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import type {BlueprintString, Icon} from '../../../../parsing/types';
import {FactorioIcon, Placeholder} from '../../../core/icons/FactorioIcon';
import {RichText} from '../../../core/text/RichText';
import {Version} from '../../../core/text/Version';
import {Panel} from '../../../ui';

interface InfoRowProps {
	label: string;
	children: ReactNode;
	hidden?: boolean;
}

const InfoRow = ({label, children, hidden = false}: InfoRowProps) => {
	if (hidden) return null;
	return (
		<>
			<dt>{label}:</dt>
			<dd>{children}</dd>
		</>
	);
};

export const BasicInfoPanelComponent = ({blueprint}: {blueprint?: BlueprintString}) => {
	if (!blueprint) return null;
	const wrapper = new BlueprintWrapper(blueprint);
	const {type, label, description, icons, version} = wrapper.getInfo();

	function getIconElement(index: number, icon?: Icon) {
		if (icon) {
			return (
				<FactorioIcon
					key={index}
					icon={icon.signal}
					size="large"
				/>
			);
		}

		return (
			<Placeholder
				key={index}
				size={'large'}
			/>
		);
	}

	return (
		<Panel title="Basic Information">
			<dl className="panel-hole basic-info">
				<InfoRow label="Type">
					<FactorioIcon
						icon={{type: 'item', name: type}}
						size={'large'}
					/>
				</InfoRow>

				<InfoRow
					label="Label"
					hidden={!label}
				>
					<RichText
						text={label}
						iconSize={'large'}
					/>
				</InfoRow>

				<InfoRow
					label="Description"
					hidden={!description}
				>
					<RichText
						text={description}
						iconSize={'large'}
					/>
				</InfoRow>

				<InfoRow
					label="Icons"
					hidden={!icons?.length}
				>
					<div className="flex flex-items-center">
						{[1, 2, 3, 4].map((index) => {
							const icon = icons?.find((icon) => icon.index === index);
							return getIconElement(index, icon);
						})}
					</div>
				</InfoRow>

				<InfoRow label="Game Version">
					<Version number={version} />
				</InfoRow>
			</dl>
		</Panel>
	);
};

BasicInfoPanelComponent.displayName = 'BasicInfoPanel';
export const BasicInfoPanel = memo(BasicInfoPanelComponent);
