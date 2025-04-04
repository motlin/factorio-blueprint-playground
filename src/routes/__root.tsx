import {createRootRoute, Link, Outlet} from '@tanstack/react-router';
import type {ComponentType} from 'react';
import {lazy, Suspense} from 'react';

import {ErrorComponent} from '../components/ErrorComponent';

// Render nothing in production
const TanStackRouterDevtools = import.meta.env.PROD
	? () => null
	: lazy(() =>
			import('@tanstack/react-router-devtools').then((res) => ({
				default: res.TanStackRouterDevtools,
			})),
		);

// Create a wrapper component to handle the type union
const DevTools = () => {
	if (import.meta.env.PROD) {
		return null;
	}

	// Use empty props object type since we don't need the specific options type
	const DevToolsComponent = TanStackRouterDevtools as ComponentType;
	return <DevToolsComponent />;
};

export const Route = createRootRoute({
	errorComponent: ErrorComponent,
	component: () => (
		<div>
			<div className="top-bar">
				<div className="top-bar-inner">
					<nav>
						<Link
							to="/"
							className="blue nowrap"
							activeProps={{
								className: 'yellow bold',
							}}
						>
							Blueprint Playground
						</Link>
						<span className="separator">|</span>
						<Link
							to="/history"
							className="blue nowrap"
							activeProps={{
								className: 'yellow bold',
							}}
						>
							History
						</Link>
					</nav>
				</div>
			</div>

			<div className="container mt12">
				<Outlet />
			</div>

			<Suspense fallback={null}>
				<DevTools />
			</Suspense>
		</div>
	),
});
