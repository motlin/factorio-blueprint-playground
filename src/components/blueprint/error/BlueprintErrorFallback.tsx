import {ButtonGreen, InsetDark, Panel} from '../../ui';

interface BlueprintErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
}

export function BlueprintErrorFallback({error, resetErrorBoundary}: BlueprintErrorFallbackProps) {
	return (
		<Panel title="Blueprint Error">
			<InsetDark>
				<p>There was an error displaying the blueprint: {error.message}</p>
				<p>Please try pasting a different blueprint string above.</p>
				<p />
				<ButtonGreen onClick={resetErrorBoundary}>Try Again</ButtonGreen>
			</InsetDark>
		</Panel>
	);
}
