export interface RouteError {
	message: string;
	status?: number;
}

export function ErrorComponent({error}: {error: RouteError}) {
	return (
		<div className="panel alert alert-error">
			<h2>Error</h2>
			<p>{error.message}</p>
			{error.status ? <p>Status: {error.status}</p> : null}
		</div>
	);
}
