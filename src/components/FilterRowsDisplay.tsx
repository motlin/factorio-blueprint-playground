import React from 'react';
import { FactorioIcon } from './FactorioIcon';
import { Cell, Row, Spreadsheet } from './spreadsheet';
import type { Filter, SignalType } from '../parsing/types';

interface FilterRowsProps {
    filters: Filter[];
    type: SignalType;
    label: string;
}

function formatFilterValue(filter: Filter): string {
    const parts: string[] = [];

    if (filter.comparator) {
        parts.push(filter.comparator);
    }

    // Add quality if present
    if (filter.quality) {
        parts.push(filter.quality);
    }

    if (filter.count !== undefined) {
        parts.push(filter.count.toString());
    }

    if (filter.max_count !== undefined) {
        parts.push('to', filter.max_count.toString());
    }

    return parts.join(' ');
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
                                <Cell width="48px" grow={false}>
                                    <FactorioIcon
                                        icon={{
                                            type,
                                            name: filter.name,
                                            quality: filter.quality
                                        }}
                                    />
                                </Cell>
                                <Cell width="200px" grow={false}>
                                    {filter.name}
                                </Cell>
                                <Cell grow>
                                    <div>
                                        {filter.type}
                                        {formatFilterValue(filter)}
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