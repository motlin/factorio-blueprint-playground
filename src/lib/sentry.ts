import * as Sentry from '@sentry/react';
import type {Router} from '@tanstack/react-router';

export function initSentry(router: Router<any, any>) {
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
				Sentry.tanstackRouterBrowserTracingIntegration(router),
			],

			tracesSampleRate: 1.0,

			replaysSessionSampleRate: 0.001,
			replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

			environment: import.meta.env.MODE,

			release: import.meta.env.VITE_APP_VERSION,

			beforeSend(event, _hint) {
				// Filter out specific errors if needed
				if (event.exception?.values?.[0]?.type === 'NetworkError') {
					return null;
				}
				return event;
			},

			transportOptions: {
				keepalive: true,
			},
		});
	}
}

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
