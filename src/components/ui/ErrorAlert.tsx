import {XCircle} from 'lucide-react';

type ErrorType = Error | string | undefined;

const formatError = (error: ErrorType): {message: string; stack?: string} => {
	if (!error) return {message: 'Unknown Error'};

	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
		};
	}

	return {message: error};
};

export const ErrorAlert = ({error}: {error: ErrorType}) => {
	if (!error) return null;

	const {message, stack} = formatError(error);

	return (
		<div className="panel alert alert-error mt16">
			<div className="flex items-center gap-2">
				<XCircle className="h-4 w-4" />
				<span>{message}</span>
			</div>
			{stack ? (
				<pre className="mt-2 max-h-48 overflow-auto bg-red-950 p-4 text-sm text-red-100">{stack}</pre>
			) : null}
		</div>
	);
};

export default ErrorAlert;
