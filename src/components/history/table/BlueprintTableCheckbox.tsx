import type React from 'react';

interface BlueprintTableCheckboxProps {
	isSelected: boolean;
	onToggle: () => void;
	onClick?: (e: React.MouseEvent) => void;
}

export function BlueprintTableCheckbox({isSelected, onToggle, onClick}: BlueprintTableCheckboxProps) {
	return (
		<div className="history-checkbox-container">
			<input
				type="checkbox"
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
