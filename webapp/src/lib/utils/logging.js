/**
 * @fileoverview Logging utilities with emoji prefixes for genproj feature
 * @description Centralized logging with consistent emoji prefixes and context
 */

/**
 * Log levels
 */
export const LOG_LEVELS = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3
};

/**
 * Current log level (can be set via environment)
 */
const currentLogLevel = (() => {
	// Check if we're in a browser environment
	if (typeof globalThis !== 'undefined' && globalThis.window) {
		// In browser, use a default level or check for a global variable
		return LOG_LEVELS.INFO;
	}

	// In Node.js environment, check environment variable
	if (typeof process !== 'undefined' && process.env?.GENPROJ_LOG_LEVEL) {
		const level = process.env.GENPROJ_LOG_LEVEL.toUpperCase();
		if (Object.prototype.hasOwnProperty.call(LOG_LEVELS, level)) {
			return LOG_LEVELS[level];
		}
	}

	return LOG_LEVELS.INFO;
})();

/**
 * Emoji prefixes for different log types
 */
const EMOJI_PREFIXES = {
	DEBUG: '🔍',
	INFO: 'ℹ️',
	SUCCESS: '✅',
	WARNING: '⚠️',
	ERROR: '❌',
	AUTH: '🔐',
	DATABASE: '🗄️',
	API: '🌐',
	FILE: '📁',
	USER: '👤',
	SYSTEM: '⚙️',
	PERFORMANCE: '⚡',
	SECURITY: '🛡️'
};

/**
 * Base logger class
 */
class GenprojLogger {
	constructor(context = 'genproj') {
		this.context = context;
	}

	/**
	 * Log debug message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	debug(message, data = {}) {
		if (currentLogLevel <= LOG_LEVELS.DEBUG) {
			this._log('DEBUG', EMOJI_PREFIXES.DEBUG, message, data);
		}
	}

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
			case 'ERROR':
				console.error(formattedMessage, data);
				break;
			case 'WARN':
				console.warn(formattedMessage, data);
				break;
			default:
				console.log(formattedMessage, data);
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
export function withTiming(fn, operation, context = {}) {
	return async (...args) => {
		const startTime = Date.now();
		perfLogger.info(`Starting ${operation}`, context);

		try {
			const result = await fn(...args);
			const duration = Date.now() - startTime;
			const logData = { duration: `${duration}ms` };
			if (context) {
				for (const key of Object.keys(context)) {
					if (Object.prototype.hasOwnProperty.call(context, key)) {
						logData[key] = context[key];
					}
				}
			}
			perfLogger.success(`Completed ${operation}`, logData);
			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const logData = {
				duration: `${duration}ms`,
				error: error.message
			};
			if (context) {
				for (const key of Object.keys(context)) {
					if (Object.prototype.hasOwnProperty.call(context, key)) {
						logData[key] = context[key];
					}
				}
			}
			perfLogger.error(`Failed ${operation}`, logData);
			throw error;
		}
	};
}

/**
 * Log API request/response
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} requestData - Request data
 * @param {Object} responseData - Response data
 * @param {number} statusCode - Response status code
 * @param {number} duration - Request duration in ms
 */
export function logApiCall(method, url, requestData, responseData, statusCode, duration) {
	const logData = {
		method,
		url,
		statusCode,
		duration: `${duration}ms`,
		requestSize: JSON.stringify(requestData).length,
		responseSize: JSON.stringify(responseData).length
	};

	if (statusCode >= 400) {
		apiLogger.error(`API call failed: ${method} ${url}`, logData);
	} else {
		apiLogger.info(`API call: ${method} ${url}`, logData);
	}
}

/**
 * Log user action
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 */
export function logUserAction(userId, action, details = {}) {
	const logData = {
		userId,
		action
	};

	for (const key of Object.keys(details)) {
		if (Object.prototype.hasOwnProperty.call(details, key)) {
			logData[key] = details[key];
		}
	}
	userLogger.info(`User action: ${action}`, logData);
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
export function logSecurityEvent(event, details = {}) {
	securityLogger.warn(`Security event: ${event}`, details);
}

/**
 * Log database operation
 * @param {string} operation - Database operation
 * @param {string} table - Table name
 * @param {Object} details - Operation details
 */
export function logDatabaseOperation(operation, table, details = {}) {
	dbLogger.info(`Database ${operation}: ${table}`, details);
}

/**
 * Log file operation
 * @param {string} operation - File operation
 * @param {string} filePath - File path
 * @param {Object} details - Operation details
 */
export function logFileOperation(operation, filePath, details = {}) {
	fileLogger.info(`File ${operation}: ${filePath}`, details);
}

/**
 * Log system event
 * @param {string} event - System event
 * @param {Object} details - Event details
 */
export function logSystemEvent(event, details = {}) {
	systemLogger.info(`System event: ${event}`, details);
}

/**
 * Set log level
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 */
export function setLogLevel(level) {
	let newLevel;
	switch (level.toUpperCase()) {
		case 'DEBUG':
			newLevel = LOG_LEVELS.DEBUG;
			break;
		case 'INFO':
			newLevel = LOG_LEVELS.INFO;
			break;
		case 'WARN':
			newLevel = LOG_LEVELS.WARN;
			break;
		case 'ERROR':
			newLevel = LOG_LEVELS.ERROR;
			break;
		default:
			return;
	}

	if (newLevel !== undefined) {
		Object.defineProperty(module.exports, 'currentLogLevel', {
			value: newLevel,
			writable: true
		});
		logger.info(`Log level set to: ${level}`);
	}
}

/**
 * Get current log level
 * @returns {string} Current log level
 */
export function getLogLevel() {
	return Object.keys(LOG_LEVELS).find((key) => LOG_LEVELS[key] === currentLogLevel);
}
