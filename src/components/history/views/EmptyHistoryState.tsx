import {InsetDark, InsetLight, Panel} from '../../ui';

export function EmptyHistoryState() {
	return (
		<Panel title="Blueprint History">
			<InsetLight>
				This panel will show your previously viewed blueprints. Each blueprint will be shown with its label,
				icons, and when you last viewed it. You&apos;ll be able to quickly reopen blueprints or download
				selections as a new blueprint book.
			</InsetLight>

			<InsetDark>No blueprints in history yet. Paste a blueprint in the playground to get started!</InsetDark>
		</Panel>
	);
}
