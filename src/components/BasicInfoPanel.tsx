import { memo } from 'preact/compat';
import type {BlueprintString} from '../parsing/types';
import {Version} from './Version';
import {FactorioIcon} from './FactorioIcon';
import {RichText} from './RichText';
import {Panel} from './ui';
import {getBlueprintContent} from "../parsing/blueprintUtils.ts";

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

export const BasicInfoPanel = memo(({ blueprint }: { blueprint: BlueprintString }) => {
    const content = getBlueprintContent(blueprint)

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
})
