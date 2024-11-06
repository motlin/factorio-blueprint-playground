import {memo} from 'preact/compat';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {BlueprintString} from '../parsing/types';

import {FactorioIcon} from './FactorioIcon';
import {RichText} from './RichText';
import {Version} from './Version';
import {Panel} from './ui';

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
    const wrapper = new BlueprintWrapper(blueprint);
    const { type, label, description, icons, version } = wrapper.getInfo();

    return (
        <Panel title="Basic Information">
            <dl className="panel-hole basic-info">
                <InfoRow label="Type">
                    <FactorioIcon type="item" name={type} />
                </InfoRow>

                <InfoRow label="Label" hidden={!label}>
                    <RichText text={label || ''} />
                </InfoRow>

                <InfoRow label="Description" hidden={!description}>
                    <RichText text={description || ''} />
                </InfoRow>

                <InfoRow label="Icons" hidden={!icons?.length}>
                    <div className="flex flex-items-center">
                        {[1, 2, 3, 4].map(index => {
                            const icon = icons?.find(icon => icon.index === index);
                            return icon ? (
                                <FactorioIcon
                                    key={index}
                                    type={icon.signal.type}
                                    name={icon.signal.name}
                                    quality={icon.signal.quality}
                                />
                            ) : (
                                <div key={index} className="placeholder"/>
                            );
                        })}
                    </div>
                </InfoRow>

                <InfoRow label="Game Version">
                    <Version number={version} />
                </InfoRow>
            </dl>
        </Panel>
    );
});
