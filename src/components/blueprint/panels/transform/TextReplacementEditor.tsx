import {useId} from 'react';

export interface TextReplacementEditorProps {
	affectedCount: number;
	enabled: boolean;
	find: string;
	onEnabledChange: (enabled: boolean) => void;
	onFindChange: (value: string) => void;
	onReplacementChange: (value: string) => void;
	replacement: string;
}

export function TextReplacementEditor({
	affectedCount,
	enabled,
	find,
	onEnabledChange,
	onFindChange,
	onReplacementChange,
	replacement,
}: TextReplacementEditorProps) {
	const headingId = useId();
	const findInputId = useId();
	const replacementInputId = useId();

	return (
		<div className="text-replacement-editor" role="group" aria-labelledby={headingId}>
			<header className="text-replacement-editor__header">
				{find === '' ? (
					<strong id={headingId}>Text replacement</strong>
				) : (
					<label className="text-replacement-editor__toggle">
						<input
							type="checkbox"
							aria-label="Enable text replacement"
							checked={enabled}
							onChange={(event) => {
								onEnabledChange(event.currentTarget.checked);
							}}
						/>
						<strong id={headingId}>Text replacement</strong>
					</label>
				)}
				<span className="text-replacement-editor__count" aria-live="polite">
					{affectedCount} affected
				</span>
			</header>
			<div className="text-replacement-editor__fields">
				<label htmlFor={findInputId}>Find</label>
				<input
					id={findInputId}
					type="text"
					value={find}
					onChange={(event) => {
						onFindChange(event.currentTarget.value);
					}}
				/>
				<span aria-hidden="true">→</span>
				<label htmlFor={replacementInputId}>Replace</label>
				<input
					id={replacementInputId}
					type="text"
					value={replacement}
					onChange={(event) => {
						onReplacementChange(event.currentTarget.value);
					}}
				/>
			</div>
		</div>
	);
}
