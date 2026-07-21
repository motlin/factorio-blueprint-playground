import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../../parsing/types';
import {shiftTier} from '../../../../transform/upgradeTier';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Panel} from '../../../ui/Panel';
import {ExportActions} from '../../export/ExportActions';

interface TransformPanelProps {
	blueprint?: BlueprintString;
}

export function TransformPanel({blueprint}: TransformPanelProps) {
	const navigate = useNavigate();
	const [includeSpaceAge, setIncludeSpaceAge] = useState(false);
	const [result, setResult] = useState<BlueprintString>();

	useEffect(() => {
		setResult(undefined);
	}, [blueprint]);

	if (blueprint === undefined) {
		return null;
	}

	const type = new BlueprintWrapper(blueprint).getType();
	if (type === 'upgrade-planner' || type === 'deconstruction-planner') {
		return null;
	}

	const applyShift = (delta: 1 | -1) => {
		setResult(shiftTier(blueprint, delta, {includeSpaceAge}));
	};

	const openInPlayground = () => {
		if (result === undefined) {
			throw new Error('Cannot open a transformation before applying it');
		}

		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(result),
				selection: '',
			},
		});
	};

	return (
		<>
			<Panel title="Transform">
				<label>
					<input
						type="checkbox"
						checked={includeSpaceAge}
						onChange={(event) => {
							setIncludeSpaceAge(event.currentTarget.checked);
						}}
					/>{' '}
					Include Space Age tiers
				</label>
				<div className="flex-space-between mt12">
					<ButtonGreen
						onClick={(event) => {
							event.preventDefault();
							applyShift(1);
						}}
					>
						Upgrade
					</ButtonGreen>
					<ButtonGreen
						onClick={(event) => {
							event.preventDefault();
							applyShift(-1);
						}}
					>
						Downgrade
					</ButtonGreen>
				</div>
			</Panel>

			{result === undefined ? null : (
				<>
					<ExportActions blueprint={result} title="Transformed Blueprint" />
					<Panel>
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								openInPlayground();
							}}
						>
							Open in Playground
						</ButtonGreen>
					</Panel>
				</>
			)}
		</>
	);
}
