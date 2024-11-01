import type { BlueprintString } from '../parsing/types';
import { Version } from './Version';
import { FactorioIcon } from './FactorioIcon';
import { RichText } from './RichText';
import {CollapsiblePanel, Panel} from './ui';

interface InfoRowProps {
    label: string;
    children: React.ReactNode;
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

function getBlueprintContent(blueprint: BlueprintString) {
    if (blueprint.blueprint) return {
        label: 'Blueprint',
        content: blueprint.blueprint
    }
    if (blueprint.blueprint_book) return {
        label: 'Blueprint Book',
        content: blueprint.blueprint_book
    }
    if (blueprint.upgrade_planner) return {
        label: 'Upgrade Planner',
        content: blueprint.upgrade_planner
    }
    if (blueprint.deconstruction_planner) return {
        label: 'Deconstruction Planner',
        content: blueprint.deconstruction_planner
    }
    throw new Error('Invalid blueprint type')
}

export const BasicInfoPanel = ({ blueprint }: { blueprint: BlueprintString }) => {
    const {label, content } = getBlueprintContent(blueprint)

    return (
        <Panel title="Basic Information">
            <dl className="panel-hole">
                <InfoRow label="Type">
                    <FactorioIcon
                        icon={{
                            type: 'item',
                            name: content.item
                        }}
                        size={24}
                    />
                </InfoRow>

                <InfoRow label="Label" hidden={!content.label}>
                    <RichText text={content.label || ''}/>
                </InfoRow>

                <InfoRow label="Description" hidden={!content.description}>
                    <RichText text={content.description || ''}/>
                </InfoRow>

                <InfoRow label="Icons" hidden={!content.icons?.length}>
                    <div className="flex flex-items-center">
                        {content.icons?.map((icon, index) => (
                            <FactorioIcon
                                key={index}
                                icon={{
                                    type: icon.signal.type,
                                    name: icon.signal.name
                                }}
                            />
                        ))}
                    </div>
                </InfoRow>

                <InfoRow label="Game Version">
                    <Version number={content.version}/>
                </InfoRow>
            </dl>
        </Panel>
    );
}
