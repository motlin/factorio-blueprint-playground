import React from 'react';

import type {Filter} from '../../../../parsing/types';
import {FactorioIcon} from '../../../FactorioIcon';

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

export default FilterCondition;
