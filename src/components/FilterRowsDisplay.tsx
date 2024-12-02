import React from 'react';

import type {Filter, SignalType} from '../parsing/types';

import {FactorioIcon} from './FactorioIcon';
import {Cell, Row, Spreadsheet} from './spreadsheet';

interface FilterRowsProps {
	filters: Filter[];
	type: SignalType;
	label: string;
}

function FilterCondition({filter}: {filter: Filter}) {
	const parts: React.ReactNode[] = [];

	if (filter.comparator) {
		parts.push(<span key="comparator">{filter.comparator} </span>);
	}

	if (filter.quality) {
		parts.push(
			<span key="quality" style={{display: 'inline-flex', alignItems: 'center', marginRight: '4px'}}>
				<FactorioIcon
					icon={{
						type: 'quality',
						name: filter.quality,
					}}
					size="large"
				/>
			</span>,
		);
	}

	if (filter.count !== undefined) {
		parts.push(<span key="count">{filter.count}</span>);
	}

	if (filter.max_count !== undefined) {
		parts.push(<span key="to"> to </span>);
		parts.push(<span key="maxCount">{filter.max_count}</span>);
	}

	return <div className="flex flex-items-center">{parts}</div>;
}

const FilterRowsDisplay = ({filters, type, label}: FilterRowsProps) => {
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
											quality: filter.quality,
										}}
										size={'large'}
									/>
								</Cell>
								<Cell width="200px" grow={false}>
									{filter.name}
								</Cell>
								<Cell grow>
									<div className="flex flex-items-center">
										{filter.type}
										<FilterCondition filter={filter} />
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
