import type React from 'react';

import {FactorioFrame, FactorioFrameDepth} from './FactorioUi';

export const InsetDark = ({children}: {children: React.ReactNode}) => (
	<FactorioFrame className="panel-inset" depth={FactorioFrameDepth.Deep}>
		{children}
	</FactorioFrame>
);
