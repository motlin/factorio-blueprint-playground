import React from "react";

export const Background = ({children}: {
    children: React.ReactNode
}) => (
    <div style={{
        backgroundColor: '#201810',
        backgroundImage: 'url("https://webcdn.factorio.com/assets/img/web/bg_v4-85.jpg")',
        backgroundSize: '2048px 3072px',
        backgroundPosition: 'center top',
        color: '#fff',
        minHeight: '100vh',
        padding: '24px'
    }}>
        {children}
    </div>
);