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
	const absoluteDescriptionId = useId();
	const headingId = useId();
	const gridPositionDescriptionId = useId();
	const positionXId = useId();
	const positionYId = useId();
	const relativeDescriptionId = useId();
	const snapDescriptionId = useId();
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
						aria-describedby={snapDescriptionId}
						checked={settings.enabled}
						data-factorio-style="caption_checkbox"
						onChange={(event) => {
							update({enabled: event.currentTarget.checked});
						}}
					/>
					<span>Snap to grid</span>
				</label>
			</h4>
			<span id={snapDescriptionId} className="transform-visually-hidden">
				Snaps the blueprint to a repeating grid when it is built.
			</span>
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
				<div
					className="blueprint-snap-grid-editor__row blueprint-snap-grid-editor__position"
					data-factorio-columns="6"
					data-factorio-source="BlueprintSettingsGui::makeSnappingsFrame"
				>
					<strong>
						Grid position
						<span className="blueprint-snap-grid-editor__info" aria-hidden="true">
							i
						</span>
					</strong>
					<span className="blueprint-snap-grid-editor__pusher" aria-hidden="true" />
					<label htmlFor={positionXId}>
						<span aria-hidden="true">X:</span>
						<span className="transform-visually-hidden">Grid position X</span>
					</label>
					<input
						id={positionXId}
						type="number"
						aria-describedby={`${gridPositionDescriptionId} ${absoluteDescriptionId}`}
						data-factorio-style="very_short_number_textfield"
						step="1"
						value={settings.positionX}
						disabled={!settings.absolute}
						onChange={(event) => {
							if (Number.isSafeInteger(event.currentTarget.valueAsNumber)) {
								update({positionX: event.currentTarget.valueAsNumber});
							}
						}}
					/>
					<label htmlFor={positionYId}>
						<span aria-hidden="true">Y:</span>
						<span className="transform-visually-hidden">Grid position Y</span>
					</label>
					<input
						id={positionYId}
						type="number"
						aria-describedby={`${gridPositionDescriptionId} ${absoluteDescriptionId}`}
						data-factorio-style="very_short_number_textfield"
						step="1"
						value={settings.positionY}
						disabled={!settings.absolute}
						onChange={(event) => {
							if (Number.isSafeInteger(event.currentTarget.valueAsNumber)) {
								update({positionY: event.currentTarget.valueAsNumber});
							}
						}}
					/>
				</div>
				<span id={gridPositionDescriptionId} className="transform-visually-hidden">
					Coordinates that position the blueprint relative to the global grid.
				</span>
				<div
					className="blueprint-snap-grid-editor__placement"
					role="radiogroup"
					aria-label="Snapping mode"
					data-factorio-source="BlueprintSettingsGui::makeSnappingsFrame"
				>
					<label title="Snaps to the global grid. Grid position X and Y set the blueprint offset.">
						<input
							type="radio"
							aria-describedby={absoluteDescriptionId}
							checked={settings.absolute}
							data-factorio-style="radiobutton"
							name={`${headingId}-placement`}
							onChange={() => {
								update({absolute: true});
							}}
						/>
						<span>Absolute</span>
						<span className="blueprint-snap-grid-editor__info" aria-hidden="true">
							i
						</span>
					</label>
					<span id={absoluteDescriptionId} className="transform-visually-hidden">
						Snaps to the global grid. Grid position X and Y set the blueprint offset.
					</span>
					<label title="Snaps relative to where dragging the blueprint started.">
						<input
							type="radio"
							aria-describedby={relativeDescriptionId}
							checked={!settings.absolute}
							data-factorio-style="radiobutton"
							name={`${headingId}-placement`}
							onChange={() => {
								update({absolute: false});
							}}
						/>
						<span>Relative</span>
						<span className="blueprint-snap-grid-editor__info" aria-hidden="true">
							i
						</span>
					</label>
					<span id={relativeDescriptionId} className="transform-visually-hidden">
						Snaps relative to where dragging the blueprint started. Grid position is unavailable in this
						mode.
					</span>
				</div>
			</fieldset>
		</section>
	);
}
