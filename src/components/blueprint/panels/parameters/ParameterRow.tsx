import {Parameter, SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';

// Helper function to detect if a string looks like a signal ID
function detectSignalType(id: string): SignalID {
	// Common virtual signals start with "signal-"
	if (id.startsWith('signal-')) {
		return {type: 'virtual-signal', name: id};
	}

	// Default to item type for unknown cases
	return {type: 'item', name: id};
}

interface ParameterRowProps {
	param: Parameter;
	parameters: Parameter[];
}

export const ParameterRow = ({param, parameters}: ParameterRowProps) => {
	// Helper to find parameter by reference
	const findIngredientParam = (ref?: string) => {
		if (!ref) return null;
		const paramIndex = parseInt(ref.replace('parameter-', ''), 10) - 1;
		return parameters[paramIndex];
	};

	// If referenced by another parameter, get that info
	const ingredientOf = param['ingredient-of'];
	const ingredientOfParam = findIngredientParam(ingredientOf);

	// For icon parameters, detect correct type
	const iconInfo: SignalID | null = param.type === 'id' && param.id ? detectSignalType(param.id) : null;

	function getIngredientOfIcon() {
		if (!(ingredientOfParam?.type === 'id' && ingredientOfParam.id)) {
			return <span>#{parameters.indexOf(ingredientOfParam ?? parameters[0]) + 1}</span>;
		}

		const icon: SignalID = detectSignalType(ingredientOfParam.id);
		return (
			<FactorioIcon
				id={'ingredientOf'}
				icon={icon}
				size={'large'}
			/>
		);
	}

	function getIngredientOfElement() {
		if (!ingredientOf) {
			return null;
		}

		return (
			<div className="flex flex-items-center">
				<label
					className="mr2"
					htmlFor={'ingredientOf'}
				>
					Ingredient of:
				</label>
				<span className="flex flex-items-center">{getIngredientOfIcon()}</span>
			</div>
		);
	}

	function getValueElement() {
		if (param.type === 'id' && iconInfo) {
			return (
				<span className="flex flex-items-center">
					<FactorioIcon
						id={'value'}
						icon={iconInfo}
						size={'large'}
					/>
				</span>
			);
		}

		return (
			<input
				id={'value'}
				type="text"
				value={param.number}
				style={{width: '60px'}}
				readOnly
			/>
		);
	}

	return (
		<div
			className="flex flex-items-center p4"
			style={{minHeight: '48px'}}
		>
			{/* Name field */}
			<div
				className="flex flex-items-center mr8"
				style={{minWidth: '200px'}}
			>
				<label
					className="mr2"
					htmlFor={'name'}
				>
					Name:
				</label>
				<input
					id={'name'}
					type="text"
					value={param.name}
					style={{width: '120px'}}
					readOnly
				/>
			</div>

			{/* Value field - either icon or number */}
			<div
				className="flex flex-items-center mr8"
				style={{minWidth: '120px'}}
			>
				<label
					className="mr2"
					htmlFor={'value'}
				>
					Value:
				</label>
				{getValueElement()}
			</div>

			{/* Parameter checkbox */}
			<div
				className="flex flex-items-center mr8"
				style={{minWidth: '120px'}}
			>
				<input
					type="checkbox"
					checked={!param['not-parametrised']}
					readOnly
					className="mr2"
					id={'isParameter'}
				/>
				<label htmlFor={'isParameter'}>Parameter</label>
			</div>

			{/* Conditional fields based on type */}
			{param.type === 'number' ? (
				<>
					<div
						className="flex flex-items-center mr8"
						style={{minWidth: '200px'}}
					>
						<label
							className="mr2"
							htmlFor={'variable'}
						>
							Variable:
						</label>
						<input
							type="text"
							value={param.variable ?? ''}
							style={{width: '120px'}}
							readOnly
							id={'variable'}
						/>
					</div>

					<div
						className="flex flex-items-center"
						style={{minWidth: '240px'}}
					>
						<input
							type="checkbox"
							checked={!!param.formula}
							readOnly
							className="mr2"
						/>
						<label
							className="mr2"
							htmlFor={'formula'}
						>
							Formula:
						</label>
						<input
							type="text"
							value={param.formula ?? ''}
							style={{width: '140px'}}
							readOnly
							id={'formula'}
						/>
					</div>
				</>
			) : (
				getIngredientOfElement()
			)}
		</div>
	);
};
