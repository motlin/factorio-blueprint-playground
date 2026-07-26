import {useId} from 'react';

interface BlueprintDescriptionEditorProps {
	accessibleLabel?: string;
	description: string;
	heading?: string;
	onDescriptionChange: (description: string) => void;
}

export function BlueprintDescriptionEditor({
	accessibleLabel = 'Blueprint description',
	description,
	heading = 'Description',
	onDescriptionChange,
}: BlueprintDescriptionEditorProps) {
	const descriptionId = useId();
	const headingId = `${descriptionId}-heading`;

	return (
		<section className="transform-workflow__section blueprint-description-editor" aria-labelledby={headingId}>
			<h4 id={headingId}>
				<label htmlFor={descriptionId}>{heading}</label>
			</h4>
			<div className="blueprint-description-editor__field">
				<textarea
					id={descriptionId}
					aria-label={accessibleLabel}
					value={description}
					onChange={(event) => {
						onDescriptionChange(event.currentTarget.value);
					}}
					onKeyDown={(event) => {
						event.stopPropagation();
					}}
				/>
			</div>
		</section>
	);
}
