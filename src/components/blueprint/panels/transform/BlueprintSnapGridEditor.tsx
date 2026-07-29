import {useEffect, useId, useState} from 'react';

import type {BlueprintSnapGrid} from '../../../../transform/blueprintEditor';

interface BlueprintSnapGridEditorProps {
	onChange: (settings: BlueprintSnapGrid) => void;
	settings: BlueprintSnapGrid;
}

interface SnapGridDimensionInputProps {
	label: string;
	onCommit: (value: number) => void;
	value: number;
}

function positiveInteger(draft: string): number | undefined {
	if (!/^\d+$/.test(draft)) {
		return undefined;
	}
	const value = Number(draft);
	return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function SnapGridDimensionInput({label, onCommit, value}: SnapGridDimensionInputProps) {
	const inputId = useId();
	const [draft, setDraft] = useState(String(value));

	useEffect(() => {
		setDraft(String(value));
	}, [value]);

	const commit = () => {
		const nextValue = positiveInteger(draft);
		if (nextValue === undefined) {
			setDraft(String(value));
		} else if (nextValue !== value) {
			onCommit(nextValue);
		}
	};

	return (
		<>
			<label htmlFor={inputId}>{label}:</label>
			<input
				id={inputId}
				type="number"
				aria-label={label}
				data-factorio-style="very_short_number_textfield"
				inputMode="numeric"
				min="1"
				step="1"
				value={draft}
				onBlur={commit}
				onChange={(event) => {
					const nextDraft = event.currentTarget.value;
					setDraft(nextDraft);
					const nextValue = positiveInteger(nextDraft);
					if (nextValue !== undefined && nextValue !== value) {
						onCommit(nextValue);
					}
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						commit();
					}
				}}
			/>
		</>
	);
}

export function BlueprintSnapGridEditor({onChange, settings}: BlueprintSnapGridEditorProps) {
	const headingId = useId();
	const settingsId = useId();

	const update = (changes: Partial<BlueprintSnapGrid>) => {
		onChange({...settings, ...changes});
	};

	return (
		<section
			className="transform-workflow__section blueprint-snap-grid-editor"
			aria-labelledby={headingId}
			data-factorio-source="BlueprintSettingsGui::makeSnappingsFrame"
			data-factorio-style="bordered_frame"
		>
			<h4 id={headingId} data-factorio-style="caption_checkbox">
				<label className="blueprint-snap-grid-editor__master">
					<input
						type="checkbox"
						aria-controls={settingsId}
						checked={settings.enabled}
						onChange={(event) => {
							update({enabled: event.currentTarget.checked});
						}}
					/>
					<span>Snap to grid</span>
				</label>
			</h4>
			<fieldset
				id={settingsId}
				className="blueprint-snap-grid-editor__settings"
				disabled={!settings.enabled}
				data-factorio-source="BlueprintSettingsGui::updateEditabilityOfSnapToGrid"
			>
				<legend className="blueprint-snap-grid-editor__legend">Snap to grid settings</legend>
				<div
					className="blueprint-snap-grid-editor__row blueprint-snap-grid-editor__dimensions"
					data-factorio-columns="6"
					data-factorio-source="BlueprintSettingsGui::makeSnappingsFrame"
				>
					<strong>Grid size</strong>
					<span className="blueprint-snap-grid-editor__pusher" aria-hidden="true" />
					<SnapGridDimensionInput
						label="Width"
						onCommit={(width) => {
							update({width});
						}}
						value={settings.width}
					/>
					<SnapGridDimensionInput
						label="Height"
						onCommit={(height) => {
							update({height});
						}}
						value={settings.height}
					/>
				</div>
				<div className="blueprint-snap-grid-editor__row blueprint-snap-grid-editor__placement">
					<strong>Placement</strong>
					<label>
						<input
							type="radio"
							name={`${headingId}-placement`}
							checked={settings.absolute}
							onChange={() => {
								update({absolute: true});
							}}
						/>{' '}
						Absolute
					</label>
					<label>
						<input
							type="radio"
							name={`${headingId}-placement`}
							checked={!settings.absolute}
							onChange={() => {
								update({absolute: false});
							}}
						/>{' '}
						Relative
					</label>
				</div>
				<div className="blueprint-snap-grid-editor__row">
					<strong>Grid position</strong>
					<label>
						X
						<input
							type="number"
							step="1"
							value={settings.positionX}
							disabled={!settings.absolute}
							onChange={(event) => {
								update({positionX: event.currentTarget.valueAsNumber});
							}}
						/>
					</label>
					<label>
						Y
						<input
							type="number"
							step="1"
							value={settings.positionY}
							disabled={!settings.absolute}
							onChange={(event) => {
								update({positionY: event.currentTarget.valueAsNumber});
							}}
						/>
					</label>
				</div>
			</fieldset>
		</section>
	);
}
