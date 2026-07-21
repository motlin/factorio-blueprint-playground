import {useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../../parsing/types';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {stripQuality, stripTiles, stripTrains, stripWires} from '../../../../transform/strip';
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
	const [stripQualitySelected, setStripQualitySelected] = useState(false);
	const [stripWiresSelected, setStripWiresSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
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
	const applyBookTransform = (transform: (book: BlueprintString) => BlueprintString) => {
		setResult(transform(blueprint));
	};
	const applyStrips = () => {
		let transformedBlueprint = blueprint;
		if (stripQualitySelected) transformedBlueprint = stripQuality(transformedBlueprint);
		if (stripWiresSelected) transformedBlueprint = stripWires(transformedBlueprint);
		if (stripTrainsSelected) transformedBlueprint = stripTrains(transformedBlueprint);
		if (stripTilesSelected) transformedBlueprint = stripTiles(transformedBlueprint);
		setResult(transformedBlueprint);
	};
	const hasSelectedStrip = stripQualitySelected || stripWiresSelected || stripTrainsSelected || stripTilesSelected;

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
				<div className="mt12">
					<label>
						<input
							type="checkbox"
							checked={stripQualitySelected}
							onChange={(event) => {
								setStripQualitySelected(event.currentTarget.checked);
							}}
						/>{' '}
						Strip quality
					</label>
					<br />
					<label>
						<input
							type="checkbox"
							checked={stripWiresSelected}
							onChange={(event) => {
								setStripWiresSelected(event.currentTarget.checked);
							}}
						/>{' '}
						Strip wires
					</label>
					<br />
					<label>
						<input
							type="checkbox"
							checked={stripTrainsSelected}
							onChange={(event) => {
								setStripTrainsSelected(event.currentTarget.checked);
							}}
						/>{' '}
						Strip trains
					</label>
					<br />
					<label>
						<input
							type="checkbox"
							checked={stripTilesSelected}
							onChange={(event) => {
								setStripTilesSelected(event.currentTarget.checked);
							}}
						/>{' '}
						Strip tiles
					</label>
				</div>
				<div className="mt12">
					<ButtonGreen
						disabled={!hasSelectedStrip}
						onClick={(event) => {
							event.preventDefault();
							applyStrips();
						}}
					>
						Apply Strips
					</ButtonGreen>
				</div>
				{type === 'blueprint-book' ? (
					<div className="flex-space-between mt12">
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								applyBookTransform(flattenBook);
							}}
						>
							Flatten Book
						</ButtonGreen>
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								applyBookTransform(sortBookByLabel);
							}}
						>
							Sort Book by Label
						</ButtonGreen>
					</div>
				) : null}
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
