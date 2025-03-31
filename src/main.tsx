import {createRouter, RouterProvider} from '@tanstack/react-router';
import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';

// Import the generated route tree
import {routeTree} from './routeTree.gen';

import './styles/factorio-a76ef767.css';
import './styles/main.css';

// Create router instance
const router = createRouter({routeTree});

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
				<RouterProvider router={router} />
			</Suspense>
		</StrictMode>,
	);
}

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
