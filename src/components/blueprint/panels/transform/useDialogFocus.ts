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
	const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]');

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

function registerDialog(dialog: HTMLElement) {
	if (dialogStack.includes(dialog)) {
		throw new Error('Dialog is already registered in the focus stack.');
	}
	dialogStack.push(dialog);
	dialogStack.sort((left, right) => {
		const position = left.compareDocumentPosition(right);
		if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
			return -1;
		}
		if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
			return 1;
		}
		return 0;
	});
	updateDialogLayers();
}

function unregisterDialog(dialog: HTMLElement) {
	const dialogIndex = dialogStack.lastIndexOf(dialog);
	if (dialogIndex < 0) {
		throw new Error('Dialog is not registered in the focus stack.');
	}
	dialogStack.splice(dialogIndex, 1);
	updateDialogLayers();
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
	return [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
		(element) => element.closest('[hidden], [aria-hidden="true"], [inert]') === null,
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

function isMultilineEditingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function initialFocusTarget(dialog: HTMLElement, initialFocusSelector: string): HTMLElement {
	const focusable = focusableElements(dialog);
	const requestedTarget = dialog.querySelector<HTMLElement>(initialFocusSelector);
	if (requestedTarget !== null && focusable.includes(requestedTarget)) {
		return requestedTarget;
	}
	const firstFocusable = focusable.at(0);
	if (firstFocusable !== undefined) {
		return firstFocusable;
	}
	dialog.tabIndex = -1;
	return dialog;
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
		registerDialog(dialog);
		const dialogHadTabIndex = dialog.hasAttribute('tabindex');
		const initialFocus = initialFocusTarget(dialog, initialFocusSelector);
		let lastFocusedElement = initialFocus;
		if (dialogStack.at(-1) === dialog) {
			initialFocus.focus();
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || dialogStack.at(-1) !== dialog || event.isComposing) {
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
				!event.repeat &&
				!(event.target instanceof HTMLButtonElement) &&
				!isMultilineEditingTarget(event.target);
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

		const handleFocusIn = (event: FocusEvent) => {
			if (dialogStack.at(-1) !== dialog) {
				return;
			}
			if (event.target instanceof HTMLElement && dialog.contains(event.target)) {
				lastFocusedElement = event.target;
				return;
			}
			if (lastFocusedElement.isConnected && dialog.contains(lastFocusedElement)) {
				lastFocusedElement.focus();
			} else {
				initialFocusTarget(dialog, initialFocusSelector).focus();
			}
		};

		window.addEventListener('keydown', handleKeyDown, true);
		document.addEventListener('focusin', handleFocusIn);
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true);
			document.removeEventListener('focusin', handleFocusIn);
			unregisterDialog(dialog);
			const nextTopmostDialog = dialogStack.at(-1);
			if (!dialogHadTabIndex) {
				dialog.removeAttribute('tabindex');
			}
			queueMicrotask(() => {
				if (
					(dialogStack.length === 0 || dialogStack.at(-1) === nextTopmostDialog) &&
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
