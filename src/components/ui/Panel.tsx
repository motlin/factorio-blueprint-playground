import type React from 'react';

export interface PanelProps {
	children: React.ReactNode;
	title?: string;
	headerContent?: React.ReactNode;
}

export const Panel = ({children, title, headerContent}: PanelProps) => (
	<div className="panel">
		{title ? (
			<h2>
				{title}
				{headerContent ? <span className="header-action">{headerContent}</span> : null}
			</h2>
		) : null}
		{children}
	</div>
);
