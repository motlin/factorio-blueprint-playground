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
        className={`button-green ${disabled ? 'disabled' : ''}`}
    >
        {children}
    </button>
);