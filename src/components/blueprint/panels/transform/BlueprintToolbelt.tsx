import {useEffect} from 'react';

import {FactorioIcon} from '../../../core/icons/FactorioIcon';

interface BlueprintToolbeltProps {
	blueprintEditorAvailable: boolean;
	blueprintEditorOpen: boolean;
	onOpenBlueprintEditor: () => void;
	onOpenUpgradePlanner: () => void;
	upgradePlannerOpen: boolean;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement &&
			(target.isContentEditable || target.closest('[contenteditable]:not([contenteditable="false"])') !== null))
	);
}

function hasNestedPicker(): boolean {
	return document.querySelectorAll('[role="dialog"]').length > 1;
}

export function BlueprintToolbelt({
	blueprintEditorAvailable,
	blueprintEditorOpen,
	onOpenBlueprintEditor,
	onOpenUpgradePlanner,
	upgradePlannerOpen,
}: BlueprintToolbeltProps) {
	useEffect(() => {
		const openTool = (event: KeyboardEvent) => {
			if (
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				isTextEditingTarget(event.target) ||
				hasNestedPicker()
			) {
				return;
			}
			if (event.code === 'KeyB' && blueprintEditorAvailable) {
				event.preventDefault();
				onOpenBlueprintEditor();
			} else if (event.code === 'KeyU') {
				event.preventDefault();
				onOpenUpgradePlanner();
			}
		};
		window.addEventListener('keydown', openTool);
		return () => {
			window.removeEventListener('keydown', openTool);
		};
	}, [blueprintEditorAvailable, onOpenBlueprintEditor, onOpenUpgradePlanner]);

	return (
		<div className="transform-toolbelt" role="toolbar" aria-label="Blueprint tools">
			{blueprintEditorAvailable ? (
				<button
					type="button"
					className="transform-toolbelt__button"
					aria-label="Open Blueprint Editor"
					aria-keyshortcuts="B"
					aria-expanded={blueprintEditorOpen}
					title="Blueprint Editor (B)"
					onClick={() => {
						onOpenBlueprintEditor();
					}}
				>
					<FactorioIcon icon={{type: 'item', name: 'blueprint'}} size="large" />
				</button>
			) : null}
			<button
				type="button"
				className="transform-toolbelt__button"
				aria-label="Open Upgrade Planner"
				aria-keyshortcuts="U"
				aria-expanded={upgradePlannerOpen}
				title="Upgrade Planner (U)"
				onClick={() => {
					onOpenUpgradePlanner();
				}}
			>
				<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
			</button>
		</div>
	);
}
