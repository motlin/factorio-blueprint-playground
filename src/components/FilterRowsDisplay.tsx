import React from 'react';
import { FactorioIcon } from './FactorioIcon';
import { Cell, Row, Spreadsheet } from './spreadsheet';
import type { Filter, SignalType } from '../parsing/types';

interface FilterRowsProps {
    filters: Filter[];
    type: SignalType;
    label: string;
}

const FilterRowsDisplay = ({ filters, type, label }: FilterRowsProps) => {
    if (!filters || filters.length === 0) return null;

    return (
        <Row>
            <Cell width="120px" grow={false}>
                {label}
            </Cell>
            <Cell grow>
                <Spreadsheet>
                    {filters
                        .sort((a, b) => a.index - b.index)
                        .map((filter, idx) => (
                            <Row key={`${filter.name}-${idx}`}>
                                <Cell width="40px" grow={false}>
                                    <FactorioIcon
                                        icon={{
                                            type,
                                            name: filter.name,
                                            quality: filter.quality
                                        }}
                                    />
                                </Cell>
                                <Cell grow>
                                    <div className="flex items-center">
                                        <span className="mr-2">{filter.name}</span>
                                        {(filter.quality || filter.comparator) && (
                                            <span className="text-gray-400">
                        {[
                            filter.quality,
                            filter.comparator
                        ]
                            .filter(Boolean)
                            .join(' ')}
                      </span>
                                        )}
                                    </div>
                                </Cell>
                            </Row>
                        ))}
                </Spreadsheet>
            </Cell>
        </Row>
    );
};

export default FilterRowsDisplay;