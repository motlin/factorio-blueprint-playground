import type { BlueprintString } from '../parsing/types';
import { Version } from './Version';
import { IconsList } from './FactorioIcon';
import { RichText } from './RichText';
import { CollapsiblePanel } from './ui';

interface InfoRowProps {
    label: string;
    children: React.ReactNode;
    hidden?: boolean;
}

const InfoRow = ({label, children, hidden = false}: InfoRowProps) => {
    if (hidden) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </>
    );
};

function getBlueprintContent(blueprint: BlueprintString) {
    if (blueprint.blueprint) return {
        type: 'blueprint' as const,
        label: 'Blueprint',
        content: blueprint.blueprint
    }
    if (blueprint.blueprint_book) return {
        type: 'blueprint_book' as const,
        label: 'Blueprint Book',
        content: blueprint.blueprint_book
    }
    if (blueprint.upgrade_planner) return {
        type: 'upgrade_planner' as const,
        label: 'Upgrade Planner',
        content: blueprint.upgrade_planner
    }
    if (blueprint.deconstruction_planner) return {
        type: 'deconstruction_planner' as const,
        label: 'Deconstruction Planner',
        content: blueprint.deconstruction_planner
    }
    throw new Error('Invalid blueprint type')
}

export const BasicInfoPanel = ({ blueprint }: { blueprint?: BlueprintString | null }) => {
    // If no blueprint, show an empty state
    if (!blueprint) {
        return (
            <CollapsiblePanel title="Basic Information" defaultExpanded>
                <div className="panel-hole">
                    <div className="text-center p16 grey">
                        Paste a blueprint to see its information
                    </div>
                </div>
            </CollapsiblePanel>
        );
    }

    const { type, label, content } = getBlueprintContent(blueprint)

    return (
        <CollapsiblePanel title="Basic Information" defaultExpanded>
            <div className="panel-hole">
                <dl className="panel-hole">
                    <InfoRow label="Type">
                        {label}
                    </InfoRow>

                    <InfoRow label="Label" hidden={!content.label}>
                        <RichText text={content.label || ''}/>
                    </InfoRow>

                    <InfoRow label="Description" hidden={!content.description}>
                        <RichText text={content.description || ''}/>
                    </InfoRow>

                    <InfoRow label="Icons" hidden={!content.icons?.length}>
                        <IconsList icons={content.icons || []}/>
                    </InfoRow>

                    <InfoRow label="Game Version">
                        <Version number={content.version}/>
                    </InfoRow>
                </dl>
            </div>
        </CollapsiblePanel>
    );
}
