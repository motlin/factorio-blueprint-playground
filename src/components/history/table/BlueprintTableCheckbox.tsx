import type React from 'react';

interface BlueprintTableCheckboxProps {
	isSelected: boolean;
	label?: string;
	onToggle: () => void;
	onClick?: (e: React.MouseEvent) => void;
}

export function BlueprintTableCheckbox({isSelected, label, onToggle, onClick}: BlueprintTableCheckboxProps) {
	return (
		<div className="history-checkbox-container">
			<input
				type="checkbox"
				aria-label={label}
				checked={isSelected}
				onChange={onToggle}
				onClick={(e) => {
					e.stopPropagation();
					onClick?.(e);
				}}
				data-testid="blueprint-checkbox"
			/>
		</div>
	);
}
