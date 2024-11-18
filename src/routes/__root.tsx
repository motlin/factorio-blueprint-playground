import {createRootRoute, Link, Outlet} from '@tanstack/react-router';
import type { ComponentType } from 'preact';
import {lazy, Suspense} from 'react';

const TanStackRouterDevtools = import.meta.env.PROD
    ? () => null // Render nothing in production
    : lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
            default: res.TanStackRouterDevtools,
        })),
    );

interface RouteError {
    message: string;
    status?: number;
}

export interface RootSearchSchema {
    data?: string
    source?: string
    json?: string
}

function ErrorComponent({ error }: { error: RouteError }) {
    return (
        <div className="panel alert alert-error">
            <h2>Error</h2>
            <p>{error.message}</p>
            {error.status && <p>Status: {error.status}</p>}
        </div>
    );
}

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
    validateSearch: (search: Record<string, unknown>): RootSearchSchema => {
        return {
            data: search.data as string | undefined,
            source: search.source as string | undefined,
            json: search.json as string | undefined,
        };
    },
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
                <Outlet/>
            </div>

            <Suspense fallback={null}>
                <DevTools />
            </Suspense>
        </div>
    ),
});
