import React from 'react';

export const Button = ({
	onClick,
	children,
	disabled = false,
}: {
	onClick: () => void;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<button
		onClick={onClick}
		disabled={disabled}
		className={`button ${disabled ? 'disabled' : ''}`}
	>
		{children}
	</button>
);
