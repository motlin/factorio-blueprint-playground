import type React from 'react';

export const ButtonGreen = ({
	onClick,
	children,
	disabled = false,
}: {
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<button
		onClick={onClick}
		disabled={disabled}
		className={`button-green-right ${disabled ? 'disabled' : ''}`}
		style={{display: 'inline-flex', alignItems: 'center'}}
	>
		{children}
	</button>
);
