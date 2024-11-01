import React from "react";

export const InsetLight = ({children}: {
    children: React.ReactNode
}) => (
    <div className="panel-inset-lighter">
        {children}
    </div>
);
