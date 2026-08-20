import {useId} from 'react';

const maximumDescriptionSize = 500;

interface BlueprintDescriptionEditorProps {
	accessibleLabel?: string;
	description: string;
	heading?: string;
	onDescriptionChange: (description: string) => void;
	variant?: 'section' | 'record-preview';
}

export function BlueprintDescriptionEditor({
	accessibleLabel = 'Blueprint description',
	description,
	heading = 'Description',
	onDescriptionChange,
	variant = 'section',
}: BlueprintDescriptionEditorProps) {
	const descriptionId = useId();
	const headingId = `${descriptionId}-heading`;

	return (
		<section
			className={`transform-workflow__section blueprint-description-editor blueprint-description-editor--${variant}`}
			data-factorio-source="BlueprintSettingsGui::makeDescriptionFrame"
			data-factorio-style="bordered_frame"
			aria-labelledby={headingId}
		>
			<h4 id={headingId} className="blueprint-description-editor__heading" data-factorio-style="caption_label">
				<label htmlFor={descriptionId}>{heading}</label>
			</h4>
			<div className="blueprint-description-editor__field">
				<textarea
					id={descriptionId}
					aria-label={accessibleLabel}
					data-factorio-source="BlueprintSettingsGui::descriptionEdit"
					data-factorio-style="edit_blueprint_description_textbox"
					maxLength={maximumDescriptionSize}
					spellCheck={false}
					value={description}
					wrap="soft"
					onChange={(event) => {
						onDescriptionChange(event.currentTarget.value);
					}}
					onKeyDown={(event) => {
						// Typing must not reach the surrounding shortcut handlers, but the
						// dialog owns Escape and the Tab focus trap.
						if (event.key !== 'Escape' && event.key !== 'Tab') {
							event.stopPropagation();
						}
					}}
				/>
			</div>
		</section>
	);
}
