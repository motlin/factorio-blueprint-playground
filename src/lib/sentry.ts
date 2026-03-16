export const logger = {
	debug: (message: string, extra?: Record<string, unknown>) => {
		console.debug(message, extra);
	},

	info: (message: string, extra?: Record<string, unknown>) => {
		console.info(message, extra);
	},

	warn: (message: string, extra?: Record<string, unknown>) => {
		console.warn(message, extra);
	},

	error: (message: string, error?: Error | unknown, extra?: Record<string, unknown>) => {
		console.error(message, error, extra);
	},
};
