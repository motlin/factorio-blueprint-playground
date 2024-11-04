import {memo} from 'preact/compat';
import {InsetDark, Panel} from './ui';
import {FactorioIcon} from './FactorioIcon';
import {BlueprintString, Parameter, SignalType} from '../parsing/types';

interface ParameterRowProps {
    param: Parameter;
    parameters: Parameter[];
}

const ParameterRow = ({ param, parameters }: ParameterRowProps) => {
    // Helper to find parameter by reference
    const findIngredientParam = (ref?: string) => {
        if (!ref) return null;
        const paramIndex = parseInt(ref.replace('parameter-', '')) - 1;
        return parameters[paramIndex];
    };

    // If referenced by another parameter, get that info
    const ingredientOf = param['ingredient-of'];
    const ingredientOfParam = findIngredientParam(ingredientOf);

    return (
        <div className="flex flex-items-center p4" style={{ minHeight: '48px' }}>
            {/* Name field */}
            <div className="flex flex-items-center mr8" style={{ minWidth: '200px' }}>
                <label className="mr2">Name:</label>
                <input
                    type="text"
                    value={param.name}
                    style={{ width: '120px' }}
                    readOnly
                />
            </div>

            {/* Value field - either icon or number */}
            <div className="flex flex-items-center mr8" style={{ minWidth: '120px' }}>
                <label className="mr2">Value:</label>
                {param.type === 'id' ? (
                    <span className="flex flex-items-center">
            <FactorioIcon
                type='item'
                name={param.id || ''}
            />
          </span>
                ) : (
                    <input
                        type="text"
                        value={param.number}
                        style={{ width: '60px' }}
                        readOnly
                    />
                )}
            </div>

            {/* Parameter checkbox */}
            <div className="flex flex-items-center mr8" style={{ minWidth: '120px' }}>
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
                    <div className="flex flex-items-center mr8" style={{ minWidth: '200px' }}>
                        <label className="mr2">Variable:</label>
                        <input
                            type="text"
                            value={param.variable || ''}
                            style={{ width: '120px' }}
                            readOnly
                        />
                    </div>

                    <div className="flex flex-items-center" style={{ minWidth: '240px' }}>
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
                            style={{ width: '140px' }}
                            readOnly
                        />
                    </div>
                </>
            ) : ingredientOf ? (
                <div className="flex flex-items-center">
                    <label className="mr2">Ingredient of:</label>
                    <span className="flex flex-items-center">
            <FactorioIcon
                type='item'
                name={`parameter-${ingredientOfParam ? parameters.indexOf(ingredientOfParam) + 1 : ''}`}
            />
            <span className="ml2">#{parameters.indexOf(ingredientOfParam || parameters[0]) + 1}</span>
          </span>
                </div>
            ) : null}
        </div>
    );
};

const ParametersList = ({ parameters }: { parameters: Parameter[] }) => {
    if (!parameters?.length) return null;

    return (
        <InsetDark>
            {parameters.map((param, index) => (
                <ParameterRow
                    key={index}
                    param={param}
                    parameters={parameters}
                />
            ))}
        </InsetDark>
    );
};

export const ParametersPanel = memo(({ blueprintString }: { blueprintString: BlueprintString | null }) => {
    if (!blueprintString?.blueprint?.parameters?.length) return null;

    return (
        <Panel title="Parameters">
            <ParametersList parameters={blueprintString.blueprint.parameters} />
        </Panel>
    );
});