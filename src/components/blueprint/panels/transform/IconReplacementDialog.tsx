import {useMemo, useState} from 'react';

import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {
	analyzeMetadataIcons,
	type IconReplacement,
	type MetadataIconCandidate,
} from '../../../../transform/metadataSubstitution';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {SignalPickerDialog} from './SignalPickerDialog';
import {SignalSlot} from './UpgradeMappingRow';
import {normalizedSignalType, pickerSignals, signalIdentity, signalName} from './upgradePlannerSignals';

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

function ReplacementEndpoint({label, onClick, signal}: ReplacementEndpointProps) {
	return (
		<span className="icon-replacement-editor__endpoint">
			<SignalSlot label={label} onClick={onClick} signal={signal} />
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
	return pickerSignals.filter(
		(signal) =>
			normalizedSignalType(signal) === normalizedSignalType(source) &&
			signalIdentity(signal) !== signalIdentity(source),
	);
}

export function IconReplacementDialog({onChange, onClose, replacements, rootBlueprint}: IconReplacementDialogProps) {
	const candidates = useMemo(() => analyzeMetadataIcons(rootBlueprint), [rootBlueprint]);
	const [draftFrom, setDraftFrom] = useState<SignalID>();
	const [choosingSource, setChoosingSource] = useState(false);
	const [choosingTarget, setChoosingTarget] = useState(false);
	const availableCandidates = candidates.filter(
		(candidate) =>
			!replacements.some((replacement) => signalIdentity(replacement.from) === signalIdentity(candidate.signal)),
	);
	const draftCount = draftFrom === undefined ? 0 : replacementCount(candidates, draftFrom);

	return (
		<div className="transform-dialog-backdrop">
			<section className="transform-dialog" role="dialog" aria-modal="true" aria-label="Icon Replacements">
				<header className="transform-dialog__header">
					<h3>Icon Replacements</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Icon Replacements"
						onClick={onClose}
					>
						×
					</button>
				</header>
				<div className="panel-hole icon-replacement-editor">
					<div className="icon-replacement-editor__mappings">
						{replacements.map((replacement) => (
							<div key={signalIdentity(replacement.from)} className="icon-replacement-editor__mapping">
								<ReplacementEndpoint
									label={`Source ${signalName(replacement.from)}`}
									signal={replacement.from}
								/>
								<span className="icon-replacement-editor__arrow" aria-hidden="true">
									→
								</span>
								<ReplacementEndpoint
									label={`Target ${signalName(replacement.to)}`}
									signal={replacement.to}
								/>
								<strong>{replacementCount(candidates, replacement.from)}</strong>
								<button
									type="button"
									className="icon-replacement-editor__remove"
									aria-label={`Remove replacement for ${signalName(replacement.from)}`}
									onClick={() => {
										onChange(
											replacements.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(replacement.from),
											),
										);
									}}
								>
									×
								</button>
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
							onClick={
								draftFrom === undefined
									? undefined
									: () => {
											setChoosingTarget(true);
										}
							}
						/>
						<strong>{draftCount}</strong>
						{draftFrom === undefined ? (
							<span className="icon-replacement-editor__placeholder" aria-hidden="true" />
						) : (
							<button
								type="button"
								className="icon-replacement-editor__remove"
								aria-label={`Clear source ${signalName(draftFrom)}`}
								onClick={() => {
									setDraftFrom(undefined);
								}}
							>
								×
							</button>
						)}
					</div>
				</div>
				<div className="transform-dialog__actions">
					<ButtonGreen onClick={onClose}>Done</ButtonGreen>
				</div>
			</section>
			{choosingSource ? (
				<SignalPickerDialog
					title="Choose source icon used here"
					options={availableCandidates.map((candidate) => candidate.signal)}
					onClose={() => {
						setChoosingSource(false);
					}}
					onChoose={(signal) => {
						setDraftFrom(signal);
						setChoosingSource(false);
					}}
				/>
			) : null}
			{choosingTarget && draftFrom !== undefined ? (
				<SignalPickerDialog
					title="Choose target icon"
					options={targetOptions(draftFrom)}
					onClose={() => {
						setChoosingTarget(false);
					}}
					onChoose={(signal) => {
						onChange([...replacements, {from: draftFrom, to: signal}]);
						setDraftFrom(undefined);
						setChoosingTarget(false);
					}}
				/>
			) : null}
		</div>
	);
}
