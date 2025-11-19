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
		const levelName = level.toUpperCase();
		let levelValue = LOG_LEVELS[levelName];

		// Special handling for custom log categories that don't have a standard level
		if (levelValue === undefined) {
			if (levelName === 'SECURITY') {
				levelValue = LOG_LEVELS.WARN;
			} else if (EMOJI_MAP[level]) {
				// Default other custom emoji-mapped levels to INFO
				levelValue = LOG_LEVELS.INFO;
			}
		}

		if (levelValue !== undefined && levelValue >= currentLogLevel) {
			const emoji = EMOJI_MAP[level] || '📝';
			const timestamp = new Date().toISOString();
			const logMessage = `${emoji} [${timestamp}] [${category}] ${message}`;

			const consoleMethod =
				level === 'warn' || level === 'security'
					? console.warn
					: level === 'error'
						? console.error
						: console.log;

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
		logger.api(message, logData);
	} else {
		logger.error(`API call failed: ${method} ${path}`, logData);
	}
};

const logUserAction = (userId, action, details) => {
	logger.user(`User action: ${action}`, { userId, ...details });
};

const logSecurityEvent = (event, details) => {
	logger.security(`Security event: ${event}`, details);
};

const logDatabaseOperation = (operation, table, details) => {
	logger.database(`Database operation: ${operation} on ${table}`, details);
};

const logFileOperation = (operation, path, details) => {
	logger.file(`File operation: ${operation} on ${path}`, details);
};

const logSystemEvent = (event, details) => {
	logger.system(`System event: ${event}`, details);
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
