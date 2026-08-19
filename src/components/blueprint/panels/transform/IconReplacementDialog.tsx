import {useId, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {
	analyzeMetadataIcons,
	type IconReplacement,
	type MetadataIconCandidate,
} from '../../../../transform/metadataSubstitution';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {SignalPickerDialog} from './SignalPickerDialog';
import {SignalSlot} from './UpgradeMappingRow';
import {chatIconPickerOptions, normalizedSignalType, signalIdentity, signalName} from './upgradePlannerSignals';
import {useDialogFocus} from './useDialogFocus';

export interface IconReplacementDialogProps {
	onChange: (replacements: IconReplacement[]) => void;
	onClose: () => void;
	replacements: readonly IconReplacement[];
	rootBlueprint: BlueprintString;
}

interface ReplacementEndpointProps {
	label: string;
	onClick?: () => void;
	signal?: SignalID;
}

const candidateCache = new WeakMap<BlueprintString, MetadataIconCandidate[]>();

function metadataIconCandidates(rootBlueprint: BlueprintString): MetadataIconCandidate[] {
	const cachedCandidates = candidateCache.get(rootBlueprint);
	if (cachedCandidates !== undefined) {
		return cachedCandidates;
	}
	const candidates = analyzeMetadataIcons(rootBlueprint);
	candidateCache.set(rootBlueprint, candidates);
	return candidates;
}

function ReplacementEndpoint({label, onClick, signal}: ReplacementEndpointProps) {
	return (
		<span className="icon-replacement-editor__endpoint">
			<SignalSlot label={label} onChoose={onClick} signal={signal} />
			{signal === undefined ? null : (
				<span className="icon-replacement-editor__name" aria-hidden="true">
					{signalName(signal)}
				</span>
			)}
		</span>
	);
}

function replacementCount(candidates: readonly MetadataIconCandidate[], signal: SignalID): number {
	return candidates.find((candidate) => signalIdentity(candidate.signal) === signalIdentity(signal))?.count ?? 0;
}

function targetOptions(source: SignalID): SignalID[] {
	return chatIconPickerOptions().filter(
		(signal) =>
			normalizedSignalType(signal) === normalizedSignalType(source) &&
			signalIdentity(signal) !== signalIdentity(source),
	);
}

export function IconReplacementDialog({onChange, onClose, replacements, rootBlueprint}: IconReplacementDialogProps) {
	const headingId = useId();
	const candidates = useMemo(() => metadataIconCandidates(rootBlueprint), [rootBlueprint]);
	const [draftFrom, setDraftFrom] = useState<SignalID>();
	const [draftTo, setDraftTo] = useState<SignalID>();
	const [choosingSource, setChoosingSource] = useState(false);
	const [choosingTarget, setChoosingTarget] = useState(false);
	const [editing, setEditing] = useState<{endpoint: 'from' | 'to'; identity: string}>();
	const availableCandidates = candidates.filter(
		(candidate) =>
			!replacements.some((replacement) => signalIdentity(replacement.from) === signalIdentity(candidate.signal)),
	);
	const draftCount = draftFrom === undefined ? 0 : replacementCount(candidates, draftFrom);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[aria-label="Choose source icon"]',
		onClose,
	});

	return createPortal(
		<div className="transform-dialog-backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="factorio-title-bar transform-dialog__header">
					<h3 id={headingId}>Icon Replacements</h3>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close Icon Replacements"
						title="Close Icon Replacements"
						onClick={onClose}
					/>
				</header>
				<div className="panel-hole icon-replacement-editor">
					<div className="icon-replacement-editor__mappings">
						{replacements.map((replacement) => (
							<div key={signalIdentity(replacement.from)} className="icon-replacement-editor__mapping">
								<ReplacementEndpoint
									label={`Edit source, currently ${signalName(replacement.from)}`}
									signal={replacement.from}
									onClick={() => {
										setEditing({endpoint: 'from', identity: signalIdentity(replacement.from)});
									}}
								/>
								<span className="icon-replacement-editor__arrow" aria-hidden="true">
									→
								</span>
								<ReplacementEndpoint
									label={`Edit target, currently ${signalName(replacement.to)}`}
									signal={replacement.to}
									onClick={() => {
										setEditing({endpoint: 'to', identity: signalIdentity(replacement.from)});
									}}
								/>
								<strong>{replacementCount(candidates, replacement.from)}</strong>
								<FactorioButton
									kind={FactorioButtonKind.Delete}
									className="icon-replacement-editor__remove"
									aria-label={`Remove replacement for ${signalName(replacement.from)}`}
									title={`Remove replacement for ${signalName(replacement.from)}`}
									onClick={() => {
										onChange(
											replacements.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(replacement.from),
											),
										);
									}}
								/>
							</div>
						))}
					</div>
					<div className="panel-hole-inner icon-replacement-editor__add">
						<ReplacementEndpoint
							label="Choose source icon"
							signal={draftFrom}
							onClick={() => {
								setChoosingSource(true);
							}}
						/>
						<span className="icon-replacement-editor__arrow" aria-hidden="true">
							→
						</span>
						<ReplacementEndpoint
							label="Choose target icon"
							signal={draftTo}
							onClick={() => {
								setChoosingTarget(true);
							}}
						/>
						<strong>{draftCount}</strong>
						{draftFrom === undefined && draftTo === undefined ? (
							<span className="icon-replacement-editor__placeholder" aria-hidden="true" />
						) : (
							<FactorioButton
								kind={FactorioButtonKind.Delete}
								className="icon-replacement-editor__remove"
								aria-label="Dismiss new replacement"
								title="Dismiss new replacement"
								onClick={() => {
									setDraftFrom(undefined);
									setDraftTo(undefined);
								}}
							/>
						)}
					</div>
				</div>
				<div className="transform-dialog__actions">
					<FactorioButton kind={FactorioButtonKind.Confirm} onClick={onClose}>
						Done
					</FactorioButton>
				</div>
			</section>
			{choosingSource ? (
				<SignalPickerDialog
					confirmationMode="immediate"
					title="Choose source icon used here"
					options={availableCandidates.map((candidate) => candidate.signal)}
					onClose={() => {
						setChoosingSource(false);
					}}
					onChoose={(signal) => {
						setChoosingSource(false);
						const compatibleTarget =
							draftTo !== undefined &&
							targetOptions(signal).some((option) => signalIdentity(option) === signalIdentity(draftTo));
						if (compatibleTarget) {
							onChange([...replacements, {from: signal, to: draftTo}]);
							setDraftFrom(undefined);
							setDraftTo(undefined);
						} else {
							setDraftFrom(signal);
							setDraftTo(undefined);
						}
					}}
				/>
			) : null}
			{editing === undefined
				? null
				: (() => {
						const editingReplacement = replacements.find(
							(replacement) => signalIdentity(replacement.from) === editing.identity,
						);
						if (editingReplacement === undefined) {
							throw new Error('The edited icon replacement no longer exists.');
						}
						if (editing.endpoint === 'from') {
							return (
								<SignalPickerDialog
									confirmationMode="immediate"
									title="Choose source icon used here"
									initialSignal={editingReplacement.from}
									options={[
										...availableCandidates.map((candidate) => candidate.signal),
										editingReplacement.from,
									]}
									onClose={() => {
										setEditing(undefined);
									}}
									onChoose={(signal) => {
										setEditing(undefined);
										if (signalIdentity(signal) === editing.identity) {
											return;
										}
										const targetStillValid = targetOptions(signal).some(
											(option) =>
												signalIdentity(option) === signalIdentity(editingReplacement.to),
										);
										const remaining = replacements.filter(
											(replacement) => signalIdentity(replacement.from) !== editing.identity,
										);
										if (targetStillValid) {
											onChange([...remaining, {from: signal, to: editingReplacement.to}]);
										} else {
											onChange(remaining);
											setDraftFrom(signal);
										}
									}}
								/>
							);
						}
						return (
							<SignalPickerDialog
								confirmationMode="immediate"
								title="Choose target icon"
								initialSignal={editingReplacement.to}
								options={targetOptions(editingReplacement.from)}
								onClose={() => {
									setEditing(undefined);
								}}
								onChoose={(signal) => {
									setEditing(undefined);
									onChange(
										replacements.map((replacement) =>
											signalIdentity(replacement.from) === editing.identity
												? {from: replacement.from, to: signal}
												: replacement,
										),
									);
								}}
							/>
						);
					})()}
			{choosingTarget ? (
				<SignalPickerDialog
					confirmationMode="immediate"
					title="Choose target icon"
					options={draftFrom === undefined ? chatIconPickerOptions() : targetOptions(draftFrom)}
					onClose={() => {
						setChoosingTarget(false);
					}}
					onChoose={(signal) => {
						setChoosingTarget(false);
						if (draftFrom === undefined) {
							setDraftTo(signal);
						} else {
							onChange([...replacements, {from: draftFrom, to: signal}]);
							setDraftFrom(undefined);
							setDraftTo(undefined);
						}
					}}
				/>
			) : null}
		</div>,
		document.body,
	);
}
