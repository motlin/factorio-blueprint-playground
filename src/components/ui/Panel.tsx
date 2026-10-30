import type React from 'react';

import {FactorioFrame, FactorioFrameDepth} from './FactorioUi';

export interface PanelProps {
	children: React.ReactNode;
	title?: string;
}

export const Panel = ({children, title}: PanelProps) => (
	<FactorioFrame className="panel" depth={FactorioFrameDepth.Shallow}>
		{title != null && title !== '' ? <h2>{title}</h2> : null}
		{children}
	</FactorioFrame>
);
