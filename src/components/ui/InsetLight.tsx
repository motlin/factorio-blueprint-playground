import React from "react";

export const InsetLight = ({children}: {
    children: React.ReactNode
}) => (
    <div style={{
        backgroundColor: '#414040',
        padding: '8px',
        margin: '4px',
        boxShadow: 'inset 0px 2px 2px -1px #000, inset 0px 0px 2px 0px #181616, inset 0px -2px 2px -2px #fff, 0px 0px 2px 0px #2b2b2b'
    }}>
        {children}
    </div>
);