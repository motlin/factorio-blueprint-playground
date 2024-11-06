import React from 'react';

interface SpreadsheetProps {
    children: React.ReactNode;
    emptyText?: string;
}

// The main spreadsheet container component
export const Spreadsheet = ({ children, emptyText = 'None' }: SpreadsheetProps) => {
    // If no children, show empty state
    if (!React.Children.count(children)) {
        return <div className="spreadsheet-container text-center">{emptyText}</div>;
    }

    return (
        <div className="spreadsheet-container">
            {children}
        </div>
    );
};
