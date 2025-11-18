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
	const logLevelFromEnv = LOG_LEVELS[process.env.GENPROJ_LOG_LEVEL?.toUpperCase()];
	currentLogLevel = logLevelFromEnv ?? (dev ? LOG_LEVELS.INFO : LOG_LEVELS.WARN);
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
		if (levelValue === undefined || levelValue < currentLogLevel) {
			return;
		}

		const emoji = EMOJI_MAP[level] || '📝';
		const timestamp = new Date().toISOString();
		const logMessage = `${emoji} [${timestamp}] [${category}] ${message}`;

		let consoleMethod;
		if (level === 'warn' || level === 'security') {
			consoleMethod = console.warn;
		} else if (level === 'error') {
			consoleMethod = console.error;
		} else {
			consoleMethod = console.log;
		}

		if (data) {
			consoleMethod(logMessage, data);
		} else {
			consoleMethod(logMessage);
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
		if (Object.prototype.hasOwnProperty.call(EMOJI_MAP, key) && !loggerInstance[key]) {
			loggerInstance[key] = (message, data) => log(key, message, data);
		}
	}

	return loggerInstance;
};

const logger = createLogger('genproj');
const authLogger = createLogger('genproj:auth');
const dbLogger = createLogger('genproj:database');
const apiLogger = createLogger('genproj:api');
const fileLogger = createLogger('genproj:file');
const systemLogger = createLogger('genproj:system');
const userLogger = createLogger('genproj:user');
const perfLogger = createLogger('genproj:performance');
const securityLogger = createLogger('genproj:security');

const setLogLevel = (level) => {
	const newLevel = LOG_LEVELS[level.toUpperCase()];
	if (newLevel !== undefined) {
		currentLogLevel = newLevel;
		logger.info(`Log level set to: ${level}`);
	} else {
		logger.warn(`Invalid log level: ${level}`);
	}
};

const getLogLevel = () => {
	return Object.keys(LOG_LEVELS).find((key) => LOG_LEVELS[key] === currentLogLevel) || 'INFO';
};

const withTiming = (fn, operationName, data = {}) => {
	return async (...args) => {
		const start = Date.now();
		try {
			const result = await fn(...args);
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

const logApiCall = (method, path, params, response, statusCode, duration) => {
	const message = `API call: ${method} ${path}`;
	const logData = { ...params, statusCode, duration: `${duration}ms` };
	if (response.ok) {
		apiLogger.info(message, logData);
	} else {
		apiLogger.error(`API call failed: ${method} ${path}`, logData);
	}
};

const logUserAction = (userId, action, details) => {
	userLogger.info(`User action: ${action}`, { userId, ...details });
};

const logSecurityEvent = (event, details) => {
	securityLogger.warn(`Security event: ${event}`, details);
};

const logDatabaseOperation = (operation, table, details) => {
	dbLogger.info(`Database operation: ${operation} on ${table}`, details);
};

const logFileOperation = (operation, path, details) => {
	fileLogger.info(`File operation: ${operation} on ${path}`, details);
};

const logSystemEvent = (event, details) => {
	systemLogger.info(`System event: ${event}`, details);
};

// Exporting all functions to be used in other modules and tests
export {
	createLogger,
	logger,
	authLogger,
	dbLogger,
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
