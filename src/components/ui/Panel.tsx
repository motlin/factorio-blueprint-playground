import React from 'react';

export const Panel = ({children, title}: {
    children: React.ReactNode
    title?: string
}) => (
    <div className="panel">
        {title && (
            <h2>{title}</h2>
        )}
        {children}
    </div>
);
