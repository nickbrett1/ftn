// webapp/src/lib/utils/logging.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as logging from './logging.js';

describe('Logging Utilities', () => {
	let consoleSpy;

	beforeEach(() => {
		// Spy on console methods
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
            info: vi.spyOn(console, 'info').mockImplementation(() => {}),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
		};
		// Reset log level before each test
		logging.setLogLevel('DEBUG');
	});

	afterEach(() => {
		// Restore all spies
		vi.restoreAllMocks();
	});

	describe('createLogger', () => {
		it('should create a logger that logs messages', () => {
			const myLogger = logging.createLogger('test-category');
			myLogger.info('This is a test');
			expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('[test-category] This is a test'));
		});

		it('should respect log levels', () => {
			logging.setLogLevel('WARN');
			const myLogger = logging.createLogger('test');
			myLogger.info('This should not be logged');
			myLogger.warn('This should be logged');
			// setLogLevel logs to info, so we expect one call
			expect(consoleSpy.info).toHaveBeenCalledTimes(1);
			expect(consoleSpy.warn).toHaveBeenCalled();
		});
	});

	describe('setLogLevel/getLogLevel', () => {
		it('should set and get the log level', () => {
			logging.setLogLevel('ERROR');
			expect(logging.getLogLevel()).toBe('ERROR');
			logging.logger.warn('This should not appear');
			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});

        it('should handle invalid log levels', () => {
            logging.setLogLevel('INVALID');
            expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid log level: INVALID'));
        });
	});

	describe('withTiming', async () => {
		it('should log the timing of a successful async function', async () => {
			const myFunc = vi.fn().mockResolvedValue('success');
			const timedFunc = logging.withTiming(myFunc, 'myFunc');
			await timedFunc();
			expect(myFunc).toHaveBeenCalled();
			expect(consoleSpy.info).toHaveBeenCalledWith(
				expect.stringContaining('Completed myFunc'),
				expect.objectContaining({
					duration: expect.any(String)
				})
			);
		});

		it('should log the timing of a failed async function', async () => {
			const errorMessage = 'Function failed';
			const myFunc = vi.fn().mockRejectedValue(new Error(errorMessage));
			const timedFunc = logging.withTiming(myFunc, 'myFunc');

			await expect(timedFunc()).rejects.toThrow(errorMessage);

			expect(myFunc).toHaveBeenCalled();
			expect(consoleSpy.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed myFunc'),
				expect.objectContaining({
					duration: expect.any(String),
					error: errorMessage
				})
			);
		});
	});

	describe('Specialized Loggers', () => {
		it('logApiCall should log successful API calls', () => {
			logging.logApiCall('GET', '/api/test', {}, { ok: true }, 200, 100);
			// The second call to info will be the api call
			expect(consoleSpy.info.mock.calls[1]).toEqual([
				expect.stringContaining('API call: GET /api/test'),
				expect.any(Object)
			]);
		});

		it('logUserAction should log user actions', () => {
			logging.logUserAction('user-1', 'click-button', { buttonId: 'submit' });
			// The second call to info will be the user action
			expect(consoleSpy.info.mock.calls[1]).toEqual([
				expect.stringContaining('User action: click-button'),
				expect.any(Object)
			]);
		});

		it('logSecurityEvent should log security events', () => {
			logging.logSecurityEvent('login-failure', { ip: '127.0.0.1' });
			expect(consoleSpy.warn).toHaveBeenCalledWith(
				expect.stringContaining('Security event: login-failure'),
				expect.any(Object)
			);
		});

		it('logDatabaseOperation should log database operations', () => {
			logging.logDatabaseOperation('insert', 'users', { userId: '123' });
			// The second call to info will be the database operation
			expect(consoleSpy.info.mock.calls[1]).toEqual([
				expect.stringContaining('Database operation: insert on users'),
				expect.any(Object)
			]);
		});

		it('logFileOperation should log file operations', () => {
			logging.logFileOperation('create', '/path/to/file', { size: 1024 });
			// The second call to info will be the file operation
			expect(consoleSpy.info.mock.calls[1]).toEqual([
				expect.stringContaining('File operation: create on /path/to/file'),
				expect.any(Object)
			]);
		});

		it('logSystemEvent should log system events', () => {
			logging.logSystemEvent('startup', { time: 100 });
			// The second call to info will be the system event
			expect(consoleSpy.info.mock.calls[1]).toEqual([
				expect.stringContaining('System event: startup'),
				expect.any(Object)
			]);
		});
	});
});
