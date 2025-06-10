import {render} from '@testing-library/react';
import React from 'react';
import {describe, it, vi} from 'vitest';

import {EditableLabelDescription} from '../../src/components/ui/EditableLabelDescription';

import {compareScreenshots} from './setup';

function renderToStaticHTML(element: React.ReactElement): string {
	const div = document.createElement('div');
	render(element, {container: div});
	return div.innerHTML;
}

describe.sequential('Edit UI Visual regression tests', () => {
	it('EditableLabelDescription renders in edit mode with empty fields', async () => {
		const html = renderToStaticHTML(
			<EditableLabelDescription
				label=""
				description=""
				onSave={vi.fn()}
				onCancel={vi.fn()}
				isEditing={true}
			/>,
		);
		await compareScreenshots('edit-ui-empty-fields', html);
	});

	it('EditableLabelDescription renders in edit mode with filled fields', async () => {
		const html = renderToStaticHTML(
			<EditableLabelDescription
				label="My Blueprint Label"
				description="This is a description of my blueprint with some details about what it does."
				onSave={vi.fn()}
				onCancel={vi.fn()}
				isEditing={true}
			/>,
		);
		await compareScreenshots('edit-ui-filled-fields', html);
	});

	it('EditableLabelDescription renders with long text content', async () => {
		const longLabel =
			'This is a very long blueprint label that might wrap or be truncated depending on the UI design';
		const longDescription = `This is a very long description that contains multiple lines of text.

It includes paragraph breaks and lots of details about the blueprint functionality.
The description might contain special formatting or game-specific references.

It should handle multiple paragraphs gracefully and show proper text wrapping behavior in the textarea component.`;

		const html = renderToStaticHTML(
			<EditableLabelDescription
				label={longLabel}
				description={longDescription}
				onSave={vi.fn()}
				onCancel={vi.fn()}
				isEditing={true}
			/>,
		);
		await compareScreenshots('edit-ui-long-content', html);
	});

	it('EditableLabelDescription within panel structure', async () => {
		// Test within a panel to show visual consistency
		const html = renderToStaticHTML(
			<div className="panel">
				<div className="title-bar">
					<h3>Basic Info - Edit Mode</h3>
				</div>
				<div className="inside">
					<EditableLabelDescription
						label="Editable Blueprint"
						description="This blueprint is being edited"
						onSave={vi.fn()}
						onCancel={vi.fn()}
						isEditing={true}
					/>
				</div>
			</div>,
		);
		await compareScreenshots('edit-ui-in-panel', html);
	});

	it('Edit UI renders at mobile viewport width', async () => {
		// Wrap in a container with mobile width constraint
		const MobileWrapper = ({children}: {children: React.ReactNode}) => (
			<div style={{width: '375px', margin: '0 auto'}}>{children}</div>
		);

		const html = renderToStaticHTML(
			<MobileWrapper>
				<EditableLabelDescription
					label="Mobile Blueprint"
					description="Testing responsive behavior on mobile devices"
					onSave={vi.fn()}
					onCancel={vi.fn()}
					isEditing={true}
				/>
			</MobileWrapper>,
		);
		await compareScreenshots('edit-ui-mobile-width', html);
	});

	it('Edit UI renders at tablet viewport width', async () => {
		// Wrap in a container with tablet width constraint
		const TabletWrapper = ({children}: {children: React.ReactNode}) => (
			<div style={{width: '768px', margin: '0 auto'}}>{children}</div>
		);

		const html = renderToStaticHTML(
			<TabletWrapper>
				<EditableLabelDescription
					label="Tablet Blueprint"
					description="Testing responsive behavior on tablet devices with medium screen width"
					onSave={vi.fn()}
					onCancel={vi.fn()}
					isEditing={true}
				/>
			</TabletWrapper>,
		);
		await compareScreenshots('edit-ui-tablet-width', html);
	});

	it('Edit UI visual consistency with existing panels', async () => {
		// Create a comparison view showing edit UI alongside existing panel styles
		const ConsistencyTestWrapper = () => (
			<div>
				{/* Standard panel for comparison */}
				<div
					className="panel"
					style={{marginBottom: '20px'}}
				>
					<div className="title-bar">
						<h3>Standard Panel Style</h3>
					</div>
					<div className="inside">
						<p>This is how a standard panel looks for visual consistency comparison.</p>
						<div className="info-field">
							<div className="info-label">Label:</div>
							<div className="info-value">Standard Display Mode</div>
						</div>
						<div className="info-field">
							<div className="info-label">Description:</div>
							<div className="info-value">This shows the normal view mode styling</div>
						</div>
					</div>
				</div>

				{/* Edit UI panel */}
				<div className="panel">
					<div className="title-bar">
						<h3>Edit Mode Panel</h3>
					</div>
					<div className="inside">
						<EditableLabelDescription
							label="Consistency Test"
							description="Checking visual consistency with existing UI components"
							onSave={vi.fn()}
							onCancel={vi.fn()}
							isEditing={true}
						/>
					</div>
				</div>
			</div>
		);

		const html = renderToStaticHTML(<ConsistencyTestWrapper />);
		await compareScreenshots('edit-ui-consistency-check', html);
	});

	it('Edit UI with special characters and formatting', async () => {
		const html = renderToStaticHTML(
			<EditableLabelDescription
				label='Blueprint with "quotes" & special <characters>'
				description={`Description with [item=iron-plate] game tags and [color=red]colored text[/color].

Also includes special characters: < > & " ' and some unicode: → ← ↑ ↓`}
				onSave={vi.fn()}
				onCancel={vi.fn()}
				isEditing={true}
			/>,
		);
		await compareScreenshots('edit-ui-special-characters', html);
	});

	it('Edit form button states', async () => {
		// Show the form with different button states
		const ButtonStatesWrapper = () => (
			<div>
				{/* Form with no changes (Save disabled) */}
				<div
					className="panel"
					style={{marginBottom: '20px'}}
				>
					<div className="title-bar">
						<h3>No Changes - Save Disabled</h3>
					</div>
					<div className="inside">
						<div className="blueprint-info-edit">
							<div className="editable-field">
								<label>Label:</label>
								<input
									className="editable-input w100p"
									value="Original Label"
									readOnly
								/>
							</div>
							<div className="editable-field">
								<label>Description:</label>
								<textarea
									className="editable-textarea"
									value="Original Description"
									readOnly
								/>
							</div>
							<div className="editable-actions">
								<button
									className="button-green button-green-disabled"
									disabled
								>
									💾 Save Changes
								</button>
								<button className="button-green">✗ Cancel</button>
							</div>
						</div>
					</div>
				</div>

				{/* Form with changes (Save enabled) */}
				<div className="panel">
					<div className="title-bar">
						<h3>With Changes - Save Enabled</h3>
					</div>
					<div className="inside">
						<div className="blueprint-info-edit">
							<div className="editable-field">
								<label>Label:</label>
								<input
									className="editable-input w100p"
									value="Modified Label"
									readOnly
								/>
							</div>
							<div className="editable-field">
								<label>Description:</label>
								<textarea
									className="editable-textarea"
									value="Modified Description"
									readOnly
								/>
							</div>
							<div className="editable-actions">
								<button className="button-green">💾 Save Changes</button>
								<button className="button-green">✗ Cancel</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);

		const html = renderToStaticHTML(<ButtonStatesWrapper />);
		await compareScreenshots('edit-ui-button-states', html);
	});
});
