import type React from 'react';

import {FactorioButton} from './FactorioUi';

export const Button = ({
	onClick,
	children,
	disabled = false,
}: {
	onClick: () => void;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<FactorioButton onClick={onClick} disabled={disabled}>
		{children}
	</FactorioButton>
);
