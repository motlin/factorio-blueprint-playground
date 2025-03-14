import {createRouter, RouterProvider} from '@tanstack/react-router';
import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';

import {routeTree} from './routeTree.gen';

import './styles/factorio-a76ef767.css';
import './styles/main.css';

const router = createRouter({routeTree: routeTree});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

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

if ('requestIdleCallback' in window) {
	window.requestIdleCallback(() => {
		void router.preloadRoute({
			to: '/history',
		});
	});
}
