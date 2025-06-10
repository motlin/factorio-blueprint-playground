import type {ReactNode} from 'react';
import {memo} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import type {BlueprintString, Icon} from '../../../../parsing/types';
import {FactorioIcon, Placeholder} from '../../../core/icons/FactorioIcon';
import {RichText} from '../../../core/text/RichText';
import {Version} from '../../../core/text/Version';
import {EditableLabelDescription, Panel} from '../../../ui';

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

interface BasicInfoPanelProps {
	blueprint?: BlueprintString;
	onLabelEdit?: (newLabel: string) => void;
	onDescriptionEdit?: (newDescription: string) => void;
	editable?: boolean;
}

export const BasicInfoPanelComponent = ({
	blueprint,
	onLabelEdit,
	onDescriptionEdit,
	editable = false,
}: BasicInfoPanelProps) => {
	if (!blueprint) return null;
	const wrapper = new BlueprintWrapper(blueprint);
	const {type, label, description, icons, version} = wrapper.getInfo();

	const handleSaveEdits = (newLabel: string, newDescription: string) => {
		if (onLabelEdit) onLabelEdit(newLabel);
		if (onDescriptionEdit) onDescriptionEdit(newDescription);
	};

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

				{editable ? (
					<EditableLabelDescription
						label={label || ''}
						description={description || ''}
						onSave={handleSaveEdits}
						// This will be handled by the parent component
						onCancel={() => {}}
						isEditing={true}
					/>
				) : (
					<>
						<InfoRow
							label="Label"
							hidden={!label}
						>
							<RichText
								text={label || ''}
								iconSize={'large'}
							/>
						</InfoRow>

						<InfoRow
							label="Description"
							hidden={!description}
						>
							<RichText
								text={description || ''}
								iconSize={'large'}
							/>
						</InfoRow>
					</>
				)}

				<InfoRow
					label="Icons"
					hidden={!icons?.length || editable}
				>
					<div className="flex flex-items-center">
						{[1, 2, 3, 4].map((index) => {
							const icon = icons?.find((icon) => icon.index === index);
							return getIconElement(index, icon);
						})}
					</div>
				</InfoRow>

				<InfoRow
					label="Game Version"
					hidden={editable}
				>
					<Version number={version} />
				</InfoRow>
			</dl>
		</Panel>
	);
};

BasicInfoPanelComponent.displayName = 'BasicInfoPanel';
export const BasicInfoPanel = memo(BasicInfoPanelComponent);
