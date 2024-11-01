import React from "react";

export const Background = ({children}: {
    children: React.ReactNode
}) => (
    <div className="container">
        {children}
    </div>
);