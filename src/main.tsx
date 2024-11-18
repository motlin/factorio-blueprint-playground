import * as Sentry from '@sentry/react';
import {createRouter, RouterProvider} from '@tanstack/react-router';
import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';

// Import the generated route tree
import {routeTree} from './routeTree.gen';

import './factorio.css';

// Create router instance
const router = createRouter({routeTree});

Sentry.init({
    dsn: 'https://3aa006e8ea7a4526e25e8d1d7da10523@o4508320086687744.ingest.us.sentry.io/4508320095404032',
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
        Sentry.tanstackRouterBrowserTracingIntegration(router),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

// Register router for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

// Root element rendering with loading fallback
const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <Suspense fallback={<div className="loading">Loading...</div>}>
                <RouterProvider router={router}/>
            </Suspense>
        </StrictMode>,
    );
}

// Initialize analytics after hydration
if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view');
}

// Preload important routes on idle
if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
        void router.preloadRoute({
            to: '/history',
        });
    });
}
