import type React from 'react';

import {FactorioButton, FactorioButtonKind} from './FactorioUi';

export const ButtonGreen = ({
	onClick,
	children,
	disabled = false,
}: {
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<FactorioButton onClick={onClick} disabled={disabled} kind={FactorioButtonKind.Confirm}>
		{children}
	</FactorioButton>
);
