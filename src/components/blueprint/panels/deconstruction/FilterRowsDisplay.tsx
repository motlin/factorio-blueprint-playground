import type {Filter, SignalType} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {Cell} from '../../spreadsheet/Cell';
import {Row} from '../../spreadsheet/Row';
import {Spreadsheet} from '../../spreadsheet/Spreadsheet';

import FilterCondition from './FilterCondition';

interface FilterRowsProps {
	filters: Filter[];
	type: SignalType;
	label: string;
}

const FilterRowsDisplay = ({filters, type, label}: FilterRowsProps) => {
	if (!filters || filters.length === 0) return null;

	return (
		<Row>
			<Cell
				width="120px"
				grow={false}
			>
				{label}
			</Cell>
			<Cell grow>
				<Spreadsheet>
					{filters
						.sort((a, b) => a.index - b.index)
						.map((filter, idx) => (
							<Row key={`${filter.name}-${idx}`}>
								<Cell
									width="48px"
									grow={false}
								>
									<FactorioIcon
										icon={{
											type,
											name: filter.name,
											quality: filter.quality,
										}}
										size={'large'}
									/>
								</Cell>
								<Cell
									width="200px"
									grow={false}
								>
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
