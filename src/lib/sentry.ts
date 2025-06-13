import * as Sentry from '@sentry/react';
import {BrowserClient, defaultStackParser, makeFetchTransport} from '@sentry/browser';

export function initSentry() {
	// Only initialize in production
	if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
		Sentry.init({
			dsn: import.meta.env.VITE_SENTRY_DSN,
			integrations: [
				// Browser integrations
				Sentry.breadcrumbsIntegration(),
				Sentry.globalHandlersIntegration(),
				Sentry.httpContextIntegration(),
				Sentry.linkedErrorsIntegration(),

				// React specific integrations
				Sentry.reactRouterV7BrowserTracingIntegration({
					useEffect: true,
					useLocation: true,
					useNavigationType: true,
				}),
			],

			// Performance Monitoring
			tracesSampleRate: 1.0,

			// Session Replay
			replaysSessionSampleRate: 0.1, // 10% of sessions
			replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

			// Environment
			environment: import.meta.env.MODE,

			// Release tracking
			release: import.meta.env.VITE_APP_VERSION,

			// Filtering
			beforeSend(event, _hint) {
				// Filter out specific errors if needed
				if (event.exception?.values?.[0]?.type === 'NetworkError') {
					return null;
				}
				return event;
			},

			// Transport options for better performance
			transportOptions: {
				// Keep the connection alive for better performance
				keepalive: true,
			},
		});
	}
}

// Custom logging functions that integrate with Sentry
export const logger = {
	debug: (message: string, extra?: Record<string, any>) => {
		console.debug(message, extra);
		Sentry.addBreadcrumb({
			message,
			level: 'debug',
			category: 'logger',
			data: extra,
		});
	},

	info: (message: string, extra?: Record<string, any>) => {
		console.info(message, extra);
		Sentry.addBreadcrumb({
			message,
			level: 'info',
			category: 'logger',
			data: extra,
		});
	},

	warn: (message: string, extra?: Record<string, any>) => {
		console.warn(message, extra);
		Sentry.addBreadcrumb({
			message,
			level: 'warning',
			category: 'logger',
			data: extra,
		});
	},

	error: (message: string, error?: Error | unknown, extra?: Record<string, any>) => {
		console.error(message, error, extra);

		// Send to Sentry as an error event
		Sentry.captureMessage(message, 'error');

		if (error instanceof Error) {
			Sentry.captureException(error, {
				contexts: {
					logger: {
						message,
						extra,
					},
				},
			});
		}
	},
};

// Utility to set user context
export function setSentryUser(user: {id: string; username?: string; email?: string}) {
	Sentry.setUser(user);
}

// Utility to clear user context
export function clearSentryUser() {
	Sentry.setUser(null);
}

// Utility to add custom context
export function setSentryContext(key: string, context: Record<string, any>) {
	Sentry.setContext(key, context);
}

// Utility to track custom events
export function trackEvent(name: string, data?: Record<string, any>) {
	Sentry.addBreadcrumb({
		category: 'custom-event',
		message: name,
		level: 'info',
		data,
	});
}
