import {useLayoutEffect, useRef, type RefObject} from 'react';

const focusableSelector = [
	'button:not([disabled]):not([aria-disabled="true"])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'a[href]',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

interface DialogState {
	ariaHidden: string | null;
	inert: boolean;
}

interface DialogFocusOptions {
	closeOnQ?: boolean;
	initialFocusSelector: string;
	onClose: () => void;
	onEnter?: () => void;
}

const dialogStack: HTMLElement[] = [];
const originalDialogStates = new Map<HTMLElement, DialogState>();

function setDialogInert(dialog: HTMLElement, inert: boolean) {
	dialog.inert = inert;
	if (inert) {
		dialog.setAttribute('inert', '');
	} else {
		dialog.removeAttribute('inert');
	}
}

function updateDialogLayers() {
	const topmostDialog = dialogStack.at(-1);
	const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');

	for (const dialog of dialogs) {
		if (!originalDialogStates.has(dialog)) {
			originalDialogStates.set(dialog, {
				ariaHidden: dialog.getAttribute('aria-hidden'),
				inert: dialog.inert || dialog.hasAttribute('inert'),
			});
		}

		if (topmostDialog === undefined) {
			const originalState = originalDialogStates.get(dialog);
			setDialogInert(dialog, originalState?.inert ?? false);
			if (originalState?.ariaHidden === null || originalState === undefined) {
				dialog.removeAttribute('aria-hidden');
			} else {
				dialog.setAttribute('aria-hidden', originalState.ariaHidden);
			}
		} else if (dialog === topmostDialog) {
			setDialogInert(dialog, false);
			dialog.removeAttribute('aria-hidden');
		} else {
			setDialogInert(dialog, true);
			dialog.setAttribute('aria-hidden', 'true');
		}
	}

	if (topmostDialog === undefined) {
		originalDialogStates.clear();
	}
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
	return [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
		(element) => element.hidden === false && element.getAttribute('aria-hidden') !== 'true',
	);
}

function isUnmodifiedKey(event: KeyboardEvent) {
	return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function trapTabKey(dialog: HTMLElement, event: KeyboardEvent) {
	const focusable = focusableElements(dialog);
	if (focusable.length === 0) {
		event.preventDefault();
		return;
	}

	const activeElement = document.activeElement;
	const firstElement = focusable[0];
	const lastElement = focusable.at(-1);
	if (!dialog.contains(activeElement)) {
		event.preventDefault();
		firstElement.focus();
	} else if (event.shiftKey && activeElement === firstElement) {
		event.preventDefault();
		lastElement?.focus();
	} else if (!event.shiftKey && activeElement === lastElement) {
		event.preventDefault();
		firstElement.focus();
	}
}

export function useDialogFocus<T extends HTMLElement>({
	closeOnQ = false,
	initialFocusSelector,
	onClose,
	onEnter,
}: DialogFocusOptions): RefObject<T | null> {
	const dialogReference = useRef<T>(null);
	const invokingElementReference = useRef<HTMLElement | undefined>(undefined);
	const onCloseReference = useRef(onClose);
	const onEnterReference = useRef(onEnter);
	const handlesEnter = onEnter !== undefined;
	onCloseReference.current = onClose;
	onEnterReference.current = onEnter;

	useLayoutEffect(() => {
		const dialog = dialogReference.current;
		if (dialog === null) {
			return undefined;
		}

		if (
			invokingElementReference.current === undefined &&
			document.activeElement instanceof HTMLElement &&
			!dialog.contains(document.activeElement)
		) {
			invokingElementReference.current = document.activeElement;
		}
		dialogStack.push(dialog);
		updateDialogLayers();

		const initialFocus = dialog.querySelector<HTMLElement>(initialFocusSelector) ?? focusableElements(dialog).at(0);
		initialFocus?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (dialogStack.at(-1) !== dialog) {
				return;
			}
			if (event.key === 'Tab') {
				trapTabKey(dialog, event);
				return;
			}

			const shouldClose =
				event.key === 'Escape' ||
				(closeOnQ && event.code === 'KeyQ' && isUnmodifiedKey(event) && !isTextEditingTarget(event.target));
			const shouldConfirm =
				onEnterReference.current !== undefined &&
				event.key === 'Enter' &&
				isUnmodifiedKey(event) &&
				!(event.target instanceof HTMLButtonElement);
			if (!shouldClose && !shouldConfirm) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			if (shouldConfirm) {
				onEnterReference.current?.();
			} else {
				onCloseReference.current();
			}
		};

		window.addEventListener('keydown', handleKeyDown, true);
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true);
			const dialogIndex = dialogStack.lastIndexOf(dialog);
			if (dialogIndex >= 0) {
				dialogStack.splice(dialogIndex, 1);
			}
			const nextTopmostDialog = dialogStack.at(-1);
			updateDialogLayers();
			queueMicrotask(() => {
				if (
					dialogStack.at(-1) === nextTopmostDialog &&
					invokingElementReference.current?.isConnected === true &&
					!invokingElementReference.current.closest('[inert]')
				) {
					invokingElementReference.current.focus();
				}
			});
		};
	}, [closeOnQ, handlesEnter, initialFocusSelector]);

	return dialogReference;
}
