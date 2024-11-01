import React from "react";

export const Button = ({
                           onClick,
                           children,
                           disabled = false
                       }: {
    onClick: () => void
    children: React.ReactNode
    disabled?: boolean
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            backgroundColor: disabled ? '#3d3d3d' : '#8e8e8e',
            color: disabled ? '#818181' : '#000',
            padding: '10px 12px',
            fontSize: '100%',
            fontWeight: 600,
            minWidth: '128px',
            border: 'none',
            lineHeight: 'inherit',
            whiteSpace: 'nowrap',
            boxShadow: disabled
                ? 'inset 8px 0px 4px -8px #000, inset -8px 0px 4px -8px #000, inset 0px 8px 4px -8px #000, inset 0px -6px 4px -8px #818181, inset 0px -8px 4px -8px #000, 0px 0px 4px 0px #000'
                : 'inset 8px 0px 4px -8px #000, inset -8px 0px 4px -8px #000, inset 0px 10px 2px -8px #e3e3e3, inset 0px 10px 2px -8px #282828, inset 0px -9px 2px -8px #000, 0px 0px 4px 0px #000',
            cursor: disabled ? 'default' : 'pointer',
            height: '36px',
            marginRight: '14px'
        }}
    >
        {children}
    </button>
);