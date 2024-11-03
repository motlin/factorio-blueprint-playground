import {InsetDark, Panel} from './ui';
import { FactorioIcon } from './FactorioIcon';
import type { Parameter } from '../parsing/types';

interface ParameterRowProps {
    param: Parameter;
    index: number;
    parameters: Parameter[];
}

const ParameterRow = ({ param, index, parameters }: ParameterRowProps) => {
    // Helper to find parameter by reference
    const findIngredientParam = (ref: string) => {
        if (!ref) return null;
        const paramIndex = parseInt(ref.replace('parameter-', '')) - 1;
        return parameters[paramIndex];
    };

    // If referenced by another parameter, get that info
    const ingredientOfParam = findIngredientParam(param['ingredient-of']);

    return (
        <div className="panel m4 p2">
            <div className="flex flex-items-center mb4">
                {/* Name field */}
                <div className="mr2">
                    <label className="mr2">Name:</label>
                    <input
                        type="text"
                        value={param.name}
                        className="w-32"
                        readOnly
                    />
                </div>

                {/* Value field - either icon or number */}
                <div className="mr2">
                    <label className="mr2">Value:</label>
                    {param.type === 'id' ? (
                        <span className="inline-flex items-center">
            <FactorioIcon
                icon={{
                    type: 'item',
                    name: param.id || ''
                }}
                size={24}
            />
          </span>
                    ) : (
                        <input
                            type="text"
                            value={param.number}
                            className="w-16"
                            readOnly
                        />
                    )}
                </div>

                {/* Parameter checkbox */}
                <div className="mr2">
                    <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className="mr2"
                    />
                    <label>Parameter</label>
                </div>

                {/* Conditional fields based on type */}
                {param.type === 'number' ? (
                    <>
                        <div className="mr2">
                            <label className="mr2">Variable:</label>
                            <input
                                type="text"
                                value={param.variable || ''}
                                className="w-24"
                                readOnly
                            />
                        </div>

                        <div className="mr2">
                            <input
                                type="checkbox"
                                checked={!!param.formula}
                                readOnly
                                className="mr2"
                            />
                            <label className="mr2">Formula:</label>
                            <input
                                type="text"
                                value={param.formula || ''}
                                className="w-32"
                                readOnly
                            />
                        </div>
                    </>
                ) : param['ingredient-of'] ? (
                    <div className="mr2">
                        <label className="mr2">Ingredient of:</label>
                        <span className="inline-flex items-center">
            <FactorioIcon
                icon={{
                    type: 'item',
                    name: `parameter-${ingredientOfParam ? parameters.indexOf(ingredientOfParam) + 1 : ''}`
                }}
                size={24}
            />
            <span className="ml2">#{parameters.indexOf(ingredientOfParam || parameters[0]) + 1}</span>
          </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export const ParametersList = ({ parameters }: { parameters: Parameter[] }) => {
    if (!parameters?.length) return null;

    return (
        <InsetDark>
            <div className="p-4">
                {parameters.map((param, index) => (
                    <ParameterRow
                        key={index}
                        param={param}
                        index={index}
                        parameters={parameters}
                    />
                ))}
            </div>
        </InsetDark>
    );
};

export default ParametersList;