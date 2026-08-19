import {useId} from 'react';

interface BlueprintDescriptionEditorProps {
	description: string;
	onDescriptionChange: (description: string) => void;
}

export function BlueprintDescriptionEditor({description, onDescriptionChange}: BlueprintDescriptionEditorProps) {
	const descriptionId = useId();
	const headingId = `${descriptionId}-heading`;

	return (
		<section className="transform-workflow__section blueprint-description-editor" aria-labelledby={headingId}>
			<h4 id={headingId}>
				<label htmlFor={descriptionId}>Description</label>
			</h4>
			<div className="blueprint-description-editor__field">
				<textarea
					id={descriptionId}
					aria-label="Blueprint description"
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
