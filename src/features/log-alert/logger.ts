// Log levels: debug < info < warn < error < critical. Critical always prints + stack trace.
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
interface LogConfig {
	component: string;
}

const DEBUG_KEY = "DEBUG";
const DEBUG_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const isDev = import.meta.env.DEV;
const isServer = typeof window === "undefined";

// Check if debug mode is enabled via localStorage with 1hr expiry.
function isDebugMode(): boolean {
	if (isServer) return false;

	try {
		const debugValue = localStorage.getItem(DEBUG_KEY);
		if (!debugValue) return false;

		const timestamp = parseInt(debugValue, 10);
		if (isNaN(timestamp)) {
			localStorage.removeItem(DEBUG_KEY);
			return false;
		}

		const now = Date.now();
		if (now - timestamp > DEBUG_EXPIRY_MS) {
			localStorage.removeItem(DEBUG_KEY);
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

function shouldPrint(level: LogLevel): boolean {
	const debugMode = isDebugMode();

	// Critical always prints
	if (level === "critical") return true;

	// Dev mode: everything prints
	if (isDev) return true;

	// Production + Server: warn, error print
	if (isServer) {
		return level === "warn" || level === "error";
	}

	// Production + Client: only print if debug mode on
	if (debugMode) return true;

	// Production + Client + Debug off: silent
	return false;
}

function getConsoleMethod(level: LogLevel): typeof console.log {
	switch (level) {
		case "debug":
			return console.log;
		case "info":
			return console.info;
		case "warn":
			return console.warn;
		case "error":
		case "critical":
			return console.error;
		default:
			return console.log;
	}
}

// Core logging function.
function log(
	level: LogLevel,
	config: LogConfig,
	message: string,
	...args: unknown[]
): void {
	if (!shouldPrint(level)) return;

	const prefix = `[${level.toUpperCase()}][${config.component}]`;
	const consoleMethod = getConsoleMethod(level);

	if (level === "critical") {
		consoleMethod(prefix, message, ...args);
		console.trace("[TRACE] Critical error location");
	} else {
		consoleMethod(prefix, message, ...args);
	}
}

// Usage: logger.info({ component: 'Checkout' }, 'message', optionalData)
export const logger = {
	debug: (config: LogConfig, message: string, ...args: unknown[]) =>
		log("debug", config, message, ...args),
	info: (config: LogConfig, message: string, ...args: unknown[]) =>
		log("info", config, message, ...args),
	warn: (config: LogConfig, message: string, ...args: unknown[]) =>
		log("warn", config, message, ...args),
	error: (config: LogConfig, message: string, ...args: unknown[]) =>
		log("error", config, message, ...args),
	critical: (config: LogConfig, message: string, ...args: unknown[]) =>
		log("critical", config, message, ...args),
};
