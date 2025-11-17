// webapp/src/lib/utils/logging.js
import { dev, browser } from '$app/environment';

const LOG_LEVELS = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
	SILENT: 4
};

let currentLogLevel;
if (browser) {
	// In the browser, process.env is not available. Default to INFO in dev, WARN in prod.
	currentLogLevel = dev ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
} else {
	// On the server, use process.env if available, otherwise default.
	currentLogLevel =
		LOG_LEVELS[process.env.GENPROJ_LOG_LEVEL?.toUpperCase()] ??
		(dev ? LOG_LEVELS.INFO : LOG_LEVELS.WARN);
}

const EMOJI_MAP = {
	info: '💡',
	warn: '⚠️',
	error: '❌',
	debug: '🐞',
	auth: '🔑',
	api: '📡',
	database: '💾',
	file: '📄',
	system: '⚙️',
	user: '👤',
	performance: '⏱️',
	security: '🛡️'
};

const createLogger = (category) => {
	const log = (level, message, data) => {
		const levelValue = LOG_LEVELS[level.toUpperCase()];
		if (levelValue !== undefined && levelValue >= currentLogLevel) {
			const emoji = EMOJI_MAP[level] || '📝';
			const timestamp = new Date().toISOString();
			const logMessage = `${emoji} [${timestamp}] [${category}] ${message}`;

			const consoleMethod =
				level === 'warn'
					? console.warn
					: level === 'error'
					? console.error
					: level === 'debug'
					? console.debug
					: console.info;

			if (data) {
				consoleMethod(logMessage, data);
			} else {
				consoleMethod(logMessage);
			}
		}
	};

	const loggerInstance = {
		info: (message, data) => log('info', message, data),
		warn: (message, data) => log('warn', message, data),
		error: (message, data) => log('error', message, data),
		debug: (message, data) => log('debug', message, data)
	};

	// Add category-specific methods
	for (const key in EMOJI_MAP) {
		if (!loggerInstance[key]) {
			// Default to 'info' for custom categories, 'warn' for security
			const level = key === 'security' ? 'warn' : 'info';
			loggerInstance[key] = (message, data) => log(level, message, data);
		}
	}

	return loggerInstance;
};

const logger = createLogger('genproj');
const authLogger = createLogger('genproj:auth');
const databaseLogger = createLogger('genproj:database');
const apiLogger = createLogger('genproj:api');
const fileLogger = createLogger('genproj:file');
const systemLogger = createLogger('genproj:system');
const userLogger = createLogger('genproj:user');
const perfLogger = createLogger('genproj:performance');
const securityLogger = createLogger('genproj:security');

const setLogLevel = (level) => {
	const newLevel = LOG_LEVELS[level.toUpperCase()];
	if (newLevel === undefined) {
		console.warn(`Invalid log level: ${level}`);
	} else {
		currentLogLevel = newLevel;
	}
};

const getLogLevel = () => {
	return Object.keys(LOG_LEVELS).find((key) => LOG_LEVELS[key] === currentLogLevel) || 'INFO';
};

const withTiming = (function_, operationName, data = {}) => {
	return async (...arguments_) => {
		const start = Date.now();
		try {
			const result = await function_(...arguments_);
			const duration = Date.now() - start;
			logger.info(`Completed ${operationName}`, { ...data, duration: `${duration}ms` });
			return result;
		} catch (error) {
			const duration = Date.now() - start;
			logger.error(`Failed ${operationName}`, {
				...data,
				duration: `${duration}ms`,
				error: error.message
			});
			throw error;
		}
	};
};

const logApiCall = (method, path, parameters, response, statusCode, duration) => {
	const message = `API call: ${method} ${path}`;
	const logData = { ...parameters, statusCode, duration: `${duration}ms` };
	if (response.ok) {
		apiLogger.api(message, logData);
	} else {
		apiLogger.error(`API call failed: ${method} ${path}`, logData);
	}
};

const logUserAction = (userId, action, details) => {
	userLogger.user(`User action: ${action}`, { userId, ...details });
};

const logSecurityEvent = (event, details) => {
	securityLogger.security(`Security event: ${event}`, details);
};

const logDatabaseOperation = (operation, table, details) => {
	databaseLogger.database(`Database operation: ${operation} on ${table}`, details);
};

const logFileOperation = (operation, path, details) => {
	fileLogger.file(`File operation: ${operation} on ${path}`, details);
};

const logSystemEvent = (event, details) => {
	systemLogger.system(`System event: ${event}`, details);
};

// Exporting all functions to be used in other modules and tests
export {
	createLogger,
	logger,
	authLogger,
	databaseLogger as dbLogger,
	apiLogger,
	fileLogger,
	systemLogger,
	userLogger,
	perfLogger,
	securityLogger,
	withTiming,
	logApiCall,
	logUserAction,
	logSecurityEvent,
	logDatabaseOperation,
	logFileOperation,
	logSystemEvent,
	setLogLevel,
	getLogLevel
};
