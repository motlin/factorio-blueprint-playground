import React from 'react';

interface TableHeaderProps {
	label: string;
	className?: string;
}

export function TableHeader({label, className = 'history-header'}: TableHeaderProps) {
	return <div className={className}>{label}</div>;
}
