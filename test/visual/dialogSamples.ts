// Every transform dialog is a `.transform-dialog` frame whose direct children are
// either full-bleed stripes (title bars, workbench bodies and footers) or content
// inset from the frame edge. This fixture carries one sample of every shape the
// app renders so the layout and edge tests survey the same set.
export const dialogSamplesHtml = `
	<div class="transform-dialog-backdrop transform-workbench-backdrop blueprint-editor__backdrop">
		<section data-dialog-sample="blueprint-editor" class="factorio-frame factorio-frame--shallow transform-dialog transform-workbench transform-workbench--blueprint" role="dialog">
			<header class="factorio-title-bar transform-dialog__header transform-workbench__header"><h3>Blueprint Editor</h3></header>
			<div class="transform-workbench__body blueprint-editor__layout">
				<div class="panel-hole transform-workflow blueprint-editor__settings">Settings</div>
			</div>
			<footer class="transform-workbench__footer transform-workbench__footer--actions blueprint-editor-actions">Actions</footer>
		</section>
	</div>
	<div class="transform-dialog-backdrop transform-workbench-backdrop upgrade-planner-dialog__backdrop">
		<section data-dialog-sample="upgrade-planner" class="factorio-frame factorio-frame--shallow transform-dialog transform-workbench transform-workbench--planner upgrade-planner-dialog" role="dialog">
			<header class="factorio-title-bar transform-dialog__header upgrade-planner-dialog__title-bar"><h3>Upgrade Planner</h3></header>
			<div class="upgrade-planner-dialog__context-strip">Context</div>
			<div class="upgrade-planner-dialog__body">Mappings</div>
			<footer class="transform-workbench__footer transform-workbench__footer--actions upgrade-planner-dialog__website-actions">Actions</footer>
		</section>
	</div>
	<div class="transform-dialog-backdrop transform-picker__backdrop">
		<section data-dialog-sample="picker" class="factorio-frame factorio-frame--shallow factorio-dialog transform-dialog transform-dialog--picker" role="dialog">
			<div class="factorio-title-bar transform-dialog__header transform-picker__header"><h3>Choose label icon</h3></div>
			<div class="panel-hole transform-picker"><div class="transform-picker__body">Signals</div></div>
			<footer class="transform-picker__footer">Confirm</footer>
		</section>
	</div>
	<div class="transform-dialog-backdrop">
		<section data-dialog-sample="parameterization" class="factorio-frame factorio-frame--shallow transform-dialog blueprint-parameterization" role="dialog">
			<header class="factorio-title-bar transform-dialog__header blueprint-parameterization__header"><h3>Blueprint parametrisation</h3></header>
			<div class="blueprint-parameterization__inside">
				<div class="blueprint-parameterization__subheader">Order</div>
				<div class="blueprint-parameterization__body">Parameters</div>
			</div>
			<footer class="blueprint-parameterization__footer">Confirm</footer>
		</section>
	</div>
	<div class="transform-dialog-backdrop upgrade-planner-selector__backdrop">
		<section data-dialog-sample="planner-selector" class="factorio-frame factorio-frame--shallow transform-dialog upgrade-planner-selector upgrade-planner-selector--draft" role="dialog">
			<div class="factorio-title-bar transform-dialog__header upgrade-planner-selector__header"><h3>Choose a planner for this draft</h3></div>
			<div class="factorio-frame factorio-frame--inside upgrade-planner-selector__inside-frame">
				<div class="upgrade-planner-selector__subheader">Hint</div>
				<div class="upgrade-planner-selector__records">Records</div>
			</div>
		</section>
	</div>
	<div class="transform-dialog-backdrop upgrade-planner-metadata__backdrop">
		<section data-dialog-sample="planner-metadata" class="factorio-frame factorio-frame--shallow transform-dialog upgrade-planner-metadata" role="dialog">
			<header class="factorio-title-bar transform-dialog__header upgrade-planner-metadata__header"><h3>Edit upgrade planner</h3></header>
			<div class="factorio-frame factorio-frame--inside upgrade-planner-metadata__record">Record</div>
			<footer class="upgrade-planner-metadata__footer">Confirm</footer>
		</section>
	</div>
	<div class="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
		<section data-dialog-sample="planner-confirmation" class="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation" role="alertdialog">
			<header class="factorio-title-bar transform-dialog__header"><h3>Discard local planner?</h3></header>
			<p>This planner has no Blueprint Library record.</p>
			<div class="transform-dialog__actions">Buttons</div>
		</section>
	</div>
	<div class="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
		<section data-dialog-sample="editor-confirmation" class="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation blueprint-editor-close-confirmation" role="alertdialog">
			<header class="factorio-title-bar transform-dialog__header"><h3>Confirmation</h3></header>
			<div class="blueprint-editor-close-confirmation__notice"><p>There are unconfirmed changes.</p></div>
			<div class="transform-dialog__actions blueprint-editor-close-confirmation__actions">Buttons</div>
		</section>
	</div>
	<div class="transform-dialog-backdrop">
		<section data-dialog-sample="icon-replacements" class="factorio-frame factorio-frame--shallow transform-dialog" role="dialog">
			<header class="factorio-title-bar transform-dialog__header"><h3>Icon Replacements</h3></header>
			<div class="panel-hole icon-replacement-editor">
				<div class="icon-replacement-editor__mappings">Mappings</div>
				<div class="panel-hole-inner icon-replacement-editor__add">Add</div>
			</div>
			<div class="transform-dialog__actions">Buttons</div>
		</section>
	</div>
`;
