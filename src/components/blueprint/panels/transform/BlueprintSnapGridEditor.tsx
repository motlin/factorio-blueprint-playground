import {useId} from 'react';

import type {BlueprintSnapGrid} from '../../../../transform/blueprintEditor';

interface BlueprintSnapGridEditorProps {
	onChange: (settings: BlueprintSnapGrid) => void;
	settings: BlueprintSnapGrid;
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
				<div className="blueprint-snap-grid-editor__row">
					<strong>Grid size</strong>
					<label>
						Width
						<input
							type="number"
							min="1"
							step="1"
							value={settings.width}
							onChange={(event) => {
								update({width: event.currentTarget.valueAsNumber});
							}}
						/>
					</label>
					<label>
						Height
						<input
							type="number"
							min="1"
							step="1"
							value={settings.height}
							onChange={(event) => {
								update({height: event.currentTarget.valueAsNumber});
							}}
						/>
					</label>
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
