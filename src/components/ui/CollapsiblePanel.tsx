import React from 'react';
import {Panel} from './Panel';

export interface CollapsiblePanelProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

export const CollapsiblePanel = ({
                                     title,
                                     children,
                                     defaultExpanded = false
                                 }: CollapsiblePanelProps) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <Panel>
            <h2>{title}</h2>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex flex-space-between w100p text-left yellow bold p8 clickable"
            >
                <span className="text-center">{isExpanded ? '−' : '+'}</span>
            </button>
            {isExpanded && (
                <div className="mt16">
                    {children}
                </div>
            )}
        </Panel>
    );
};