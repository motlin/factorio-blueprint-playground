import React from "react";

export const ButtonGreen = ({
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
            backgroundColor: disabled ? '#002b02' : '#5eb663',
            color: disabled ? '#376d3b' : '#000',
            padding: '10px 12px',
            fontSize: '100%',
            fontWeight: 600,
            minWidth: '128px',
            border: 'none',
            lineHeight: 'inherit',
            whiteSpace: 'nowrap',
            boxShadow: disabled
                ? 'inset 8px 0px 4px -8px #000, inset -8px 0px 4px -8px #000, inset 0px 8px 4px -8px #000, inset 0px -6px 4px -8px #376d3b, inset 0px -8px 4px -8px #000, 0px 0px 4px 0px #000'
                : 'inset 8px 0px 4px -8px #000, inset -8px 0px 4px -8px #000, inset 0px 10px 2px -8px #95df99, inset 0px 10px 2px -8px #163218, inset 0px -9px 2px -8px #000, 0px 0px 4px 0px #000',
            cursor: disabled ? 'default' : 'pointer',
            height: '36px',
            marginRight: '14px'
        }}
    >
        {children}
    </button>
);