import {useId} from 'react';

export interface BookWideReplacementsProps {
	iconMappingCount: number;
	iconReplacementCount: number;
	metadataFind: string;
	metadataReplace: string;
	metadataReplacementCount: number;
	onIconReplacementsOpen: () => void;
	onMetadataFindChange: (value: string) => void;
	onMetadataReplaceChange: (value: string) => void;
	onTextReplacementEnabledChange: (enabled: boolean) => void;
	textReplacementEnabled: boolean;
}

export function BookWideReplacements({
	iconMappingCount,
	iconReplacementCount,
	metadataFind,
	metadataReplace,
	metadataReplacementCount,
	onIconReplacementsOpen,
	onMetadataFindChange,
	onMetadataReplaceChange,
	onTextReplacementEnabledChange,
	textReplacementEnabled,
}: BookWideReplacementsProps) {
	const headingId = useId();
	const findInputId = useId();
	const replaceInputId = useId();

	return (
		<section className="panel-hole transform-workflow__section book-wide-replacements" aria-labelledby={headingId}>
			<div className="book-wide-replacements__website-label">Website extension</div>
			<h4 id={headingId}>Book-wide replacements</h4>
			<p className="book-wide-replacements__scope">
				Always applies to titles, descriptions, and label icons throughout the entire root book, regardless of
				the selected blueprint.
			</p>
			<div className="transform-workflow__operations">
				<button
					type="button"
					className="transform-operation"
					onClick={() => {
						onIconReplacementsOpen();
					}}
				>
					<span className="transform-operation__icon">
						<span aria-hidden="true">+</span>
					</span>
					<span className="transform-operation__text">
						<strong>Icon replacements</strong>
						<small>
							{iconMappingCount} {iconMappingCount === 1 ? 'mapping' : 'mappings'} ·{' '}
							{iconReplacementCount} {iconReplacementCount === 1 ? 'replacement' : 'replacements'}
						</small>
					</span>
					<span>Edit…</span>
				</button>
			</div>

			<div className="book-wide-replacements__text">
				<label className="book-wide-replacements__text-toggle">
					<input
						type="checkbox"
						checked={textReplacementEnabled}
						onChange={(event) => {
							onTextReplacementEnabledChange(event.currentTarget.checked);
						}}
					/>{' '}
					Text replacement <strong>{metadataReplacementCount}</strong>
				</label>
				<div>
					<label htmlFor={findInputId}>Find</label>
					<input
						id={findInputId}
						type="text"
						value={metadataFind}
						onChange={(event) => {
							onMetadataFindChange(event.currentTarget.value);
						}}
					/>
					<span aria-hidden="true">→</span>
					<label htmlFor={replaceInputId}>Replace with</label>
					<input
						id={replaceInputId}
						type="text"
						value={metadataReplace}
						onChange={(event) => {
							onMetadataReplaceChange(event.currentTarget.value);
						}}
					/>
				</div>
			</div>
		</section>
	);
}
