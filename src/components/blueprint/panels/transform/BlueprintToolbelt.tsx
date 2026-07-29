import {useEffect, useId, useRef} from 'react';

import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioButton, FactorioTooltip, FactorioTooltipPlacement} from '../../../ui/FactorioUi';

const BLUEPRINT_SHORTCUT_ICON_SOURCE = 'https://factorio-icon-cdn.pages.dev/shortcut/give-blueprint.webp';

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

function hasNestedModal(): boolean {
	if (document.querySelector('[data-factorio-dialog-layer="nested"]') !== null) {
		return true;
	}
	return (
		document.querySelectorAll('[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]')
			.length > 1
	);
}

export function BlueprintToolbelt({
	blueprintEditorAvailable,
	blueprintEditorOpen,
	onOpenBlueprintEditor,
	onOpenUpgradePlanner,
	upgradePlannerOpen,
}: BlueprintToolbeltProps) {
	const blueprintEditorButtonReference = useRef<HTMLButtonElement>(null);
	const upgradePlannerButtonReference = useRef<HTMLButtonElement>(null);
	const blueprintEditorTooltipId = useId();
	const upgradePlannerTooltipId = useId();

	useEffect(() => {
		const openTool = (event: KeyboardEvent) => {
			if (
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				isTextEditingTarget(event.target) ||
				hasNestedModal()
			) {
				return;
			}
			if (event.code === 'KeyB' && blueprintEditorAvailable) {
				event.preventDefault();
				blueprintEditorButtonReference.current?.focus();
				onOpenBlueprintEditor();
			} else if (event.code === 'KeyU') {
				event.preventDefault();
				upgradePlannerButtonReference.current?.focus();
				onOpenUpgradePlanner();
			}
		};
		window.addEventListener('keydown', openTool);
		return () => {
			window.removeEventListener('keydown', openTool);
		};
	}, [blueprintEditorAvailable, onOpenBlueprintEditor, onOpenUpgradePlanner]);

	return (
		<div
			className="transform-toolbelt"
			role="toolbar"
			aria-label="Blueprint tools"
			data-factorio-source="BottomContainer::updateLocation"
			data-factorio-style="shortcut_bar_window_frame"
			data-website-extension="blueprint-editor-tools"
		>
			<div
				className="transform-toolbelt__slots"
				data-factorio-source="ShortcutBarGui::ShortcutBarGui"
				data-factorio-style="shortcut_bar_inner_panel"
			>
				{blueprintEditorAvailable ? (
					<div className="factorio-toolbar-control transform-toolbelt__control">
						<FactorioButton
							ref={blueprintEditorButtonReference}
							className="transform-toolbelt__button transform-toolbelt__button--blueprint"
							aria-label="Open Blueprint Editor"
							aria-describedby={blueprintEditorTooltipId}
							aria-keyshortcuts="B"
							aria-expanded={blueprintEditorOpen}
							data-factorio-control-input="give-blueprint"
							data-factorio-shortcut-action="spawn-item"
							data-factorio-shortcut-order="b[blueprints]-g[blueprint]"
							data-factorio-source-style="shortcut_bar_button_blue"
							onClick={(event) => {
								event.currentTarget.focus();
								onOpenBlueprintEditor();
							}}
						>
							<img
								className="transform-toolbelt__shortcut-icon"
								src={BLUEPRINT_SHORTCUT_ICON_SOURCE}
								alt=""
								aria-hidden="true"
							/>
						</FactorioButton>
						<FactorioTooltip
							id={blueprintEditorTooltipId}
							className="factorio-toolbar-tooltip"
							heading="Blueprint Editor"
							placement={FactorioTooltipPlacement.Above}
						>
							Open this blueprint or book to edit its settings and contents.{' '}
							<span className="factorio-tooltip__shortcut">B</span>
						</FactorioTooltip>
					</div>
				) : null}
				<div className="factorio-toolbar-control transform-toolbelt__control">
					<FactorioButton
						ref={upgradePlannerButtonReference}
						className="transform-toolbelt__button transform-toolbelt__button--upgrade-planner"
						aria-label="Open Upgrade Planner"
						aria-describedby={upgradePlannerTooltipId}
						aria-keyshortcuts="U"
						aria-expanded={upgradePlannerOpen}
						data-factorio-shortcut-order="b[blueprints]-j[upgrade-planner]"
						data-factorio-source-style="shortcut_bar_button_green"
						onClick={(event) => {
							event.currentTarget.focus();
							onOpenUpgradePlanner();
						}}
					>
						<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					</FactorioButton>
					<FactorioTooltip
						id={upgradePlannerTooltipId}
						className="factorio-toolbar-tooltip"
						heading="Upgrade Planner"
						placement={FactorioTooltipPlacement.Above}
					>
						Create, edit, and apply upgrade mappings. <span className="factorio-tooltip__shortcut">U</span>
					</FactorioTooltip>
				</div>
			</div>
		</div>
	);
}
