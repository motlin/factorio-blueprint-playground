import React from "react";
import {Panel} from "./Panel";

export const CollapsiblePanel = ({
                                     title,
                                     children,
                                     defaultExpanded = false
                                 }: {
    title: string
    children: React.ReactNode
    defaultExpanded?: boolean
}) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <Panel>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex flex-space-between w100p text-left yellow bold p8 clickable"
            >
                <span>{title}</span>
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