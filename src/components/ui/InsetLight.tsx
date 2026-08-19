import type React from 'react';

import {FactorioFrame, FactorioFrameDepth} from './FactorioUi';

export const InsetLight = ({children}: {children: React.ReactNode}) => (
	<FactorioFrame className="panel-inset-lighter" depth={FactorioFrameDepth.Deep}>
		{children}
	</FactorioFrame>
);
