import React from "react";
import {Panel} from "./Panel.tsx";

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
                style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'none',
                    border: 'none',
                    color: '#ffe6c0',
                    cursor: 'pointer',
                    fontSize: '116%',
                    fontWeight: 'bold'
                }}
            >
                <span>{title}</span>
                <span style={{fontSize: '21px'}}>{isExpanded ? '−' : '+'}</span>
            </button>
            {isExpanded && (
                <div style={{marginTop: '16px'}}>
                    {children}
                </div>
            )}
        </Panel>
    );
};