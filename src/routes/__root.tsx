import {createRootRoute, Link, Outlet, useRouter} from '@tanstack/react-router';
import type {ComponentType} from 'react';
import {lazy, Suspense, useEffect, useState} from 'react';

import {ErrorComponent} from '../components/ErrorComponent';
import {db} from '../storage/db';

import type {RootSearch} from './index';

// Render nothing in production
const TanStackRouterDevtools = import.meta.env.PROD
	? () => null
	: lazy(() =>
			import('@tanstack/react-router-devtools').then((res) => ({
				default: res.TanStackRouterDevtools,
			})),
		);

const DevTools = () => {
	if (import.meta.env.PROD) {
		return null;
	}

	const DevToolsComponent = TanStackRouterDevtools as ComponentType;
	return <DevToolsComponent />;
};

export const Route = createRootRoute({
	errorComponent: ErrorComponent,
	component: () => <DynamicNavigation />,
});

const DynamicNavigation = () => {
	const [mostRecentData, setMostRecentData] = useState<RootSearch>({});
	const router = useRouter();

	// Listen for navigation events to update most recent blueprint data
	useEffect(() => {
		const unsubscribe = router.history.subscribe(() => {
			// Check if we're navigating to the root route from history and the search params contain a pasted parameter
			const location = router.state.location;
			const searchParams = location.search as RootSearch;
			if (location.pathname === '/' && searchParams.pasted) {
				setMostRecentData({
					pasted: searchParams.pasted,
					selection: searchParams.selection,
				});
			}
		});

		return () => {
			unsubscribe();
		};
	}, [router]);

	useEffect(() => {
		const loadMostRecent = async () => {
			const recentBlueprint = await db.getMostRecent();
			if (recentBlueprint) {
				setMostRecentData({
					pasted: recentBlueprint.metadata.data,
					selection: recentBlueprint.metadata.selection,
				});
			}
		};

		void loadMostRecent();
	}, []);

	return (
		<div>
			<div className="top-bar">
				<div className="top-bar-inner">
					<nav>
						<Link
							to="/"
							search={{...mostRecentData, focusTextarea: true}}
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
	);
};
