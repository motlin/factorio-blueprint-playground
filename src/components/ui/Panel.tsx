import React from 'react';

export const Panel = ({children, title}: {
    children: React.ReactNode
    title?: string
}) => (
    <div style={{
        backgroundColor: '#313031',
        padding: '8px',
        marginTop: '12px',
        marginBottom: '12px',
        overflow: 'hidden',
        border: '4px solid #2e2623',
        boxShadow: '0px 0px 3px 0px #201815'
    }}>
        {title && (
            <div style={{
                color: '#ffe6c0',
                fontSize: '116%',
                fontWeight: 'bold',
                marginBottom: '12px',
                borderBottom: '1px solid #222'
            }}>
                {title}
            </div>
        )}
        {children}
    </div>
);
