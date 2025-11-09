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
    currentLogLevel = LOG_LEVELS[process.env.GENPROJ_LOG_LEVEL?.toUpperCase()] ?? (dev ? LOG_LEVELS.INFO : LOG_LEVELS.WARN);
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
		const levelValue = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
        if (levelValue >= currentLogLevel) {
            const emoji = EMOJI_MAP[level] || '📝';
            const timestamp = new Date().toISOString();
            const logMessage = `${emoji} [${timestamp}] [${category}] ${message}`;
            
            const consoleMethod = (level === 'warn' || level === 'security') ? console.warn : level === 'error' ? console.error : console.log;
            
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
        debug: (message, data) => log('debug', message, data),
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
	return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel) || 'INFO';
};

	/**
	 * Log info message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	info(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('INFO', EMOJI_PREFIXES.INFO, message, data);
		}
	}

	/**
	 * Log success message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	success(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('SUCCESS', EMOJI_PREFIXES.SUCCESS, message, data);
		}
	}

	/**
	 * Log warning message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	warn(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.WARN) {
			this._log('WARN', EMOJI_PREFIXES.WARNING, message, data);
		}
	}

	/**
	 * Log error message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	error(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.ERROR) {
			this._log('ERROR', EMOJI_PREFIXES.ERROR, message, data);
		}
	}

	/**
	 * Log authentication event
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	auth(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('AUTH', EMOJI_PREFIXES.AUTH, message, data);
		}
	}

	/**
	 * Log database operation
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	database(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('DATABASE', EMOJI_PREFIXES.DATABASE, message, data);
		}
	}

	/**
	 * Log API operation
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	api(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('API', EMOJI_PREFIXES.API, message, data);
		}
	}

	/**
	 * Log file operation
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	file(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('FILE', EMOJI_PREFIXES.FILE, message, data);
		}
	}

	/**
	 * Log user action
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	user(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('USER', EMOJI_PREFIXES.USER, message, data);
		}
	}

	/**
	 * Log system event
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	system(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('SYSTEM', EMOJI_PREFIXES.SYSTEM, message, data);
		}
	}

	/**
	 * Log performance metric
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	performance(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.INFO) {
			this._log('PERFORMANCE', EMOJI_PREFIXES.PERFORMANCE, message, data);
		}
	}

	/**
	 * Log security event
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	security(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.WARN) {
			this._log('SECURITY', EMOJI_PREFIXES.SECURITY, message, data);
		}
	}

	/**
	 * Internal log method
	 * @param {string} level - Log level
	 * @param {string} emoji - Emoji prefix
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 * @private
	 */
	_log(level, emoji, message, data) {
		const timestamp = new Date().toISOString();
		// Format log message
		const formattedMessage = `${emoji} [${timestamp}] [${this.context}] ${message}`;

		// Use appropriate console method
		switch (level) {
			case 'ERROR': {
				console.error(formattedMessage, data);
				break;
			}
			case 'WARN': {
				console.warn(formattedMessage, data);
				break;
			}
			default: {
				console.log(formattedMessage, data);
			}
		}
	}
}

/**
 * Create logger instance with context
 * @param {string} context - Logger context
 * @returns {GenprojLogger} Logger instance
 */
export function createLogger(context) {
	return new GenprojLogger(context);
}

/**
 * Default genproj logger
 */
export const logger = createLogger('genproj');

/**
 * Specialized loggers for different components
 */
export const authLogger = createLogger('genproj:auth');
export const dbLogger = createLogger('genproj:database');
export const apiLogger = createLogger('genproj:api');
export const fileLogger = createLogger('genproj:file');
export const userLogger = createLogger('genproj:user');
export const systemLogger = createLogger('genproj:system');
export const perfLogger = createLogger('genproj:performance');
export const securityLogger = createLogger('genproj:security');

/**
 * Log function execution time
 * @param {Function} fn - Function to measure
 * @param {string} operation - Operation name
 * @param {Object} context - Additional context
 * @returns {Function} Wrapped function with timing
 */
export function withTiming(function_, operation, context = {}) {
	return async (...arguments_) => {
		const startTime = Date.now();
		perfLogger.info(`Starting ${operation}`, context);

		try {
			const result = await function_(...arguments_);
			const duration = Date.now() - startTime;
			perfLogger.success(`Completed ${operation}`, {
				...context,
				duration: `${duration}ms`
			});
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
			logger.error(`Failed ${operationName}`, { ...data, duration: `${duration}ms`, error: error.message });
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
