import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
	LOG_LEVELS,
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
} from '$lib/utils/logging.js';

const fixedDate = new Date('2024-01-01T00:00:00.000Z');

describe('logging utilities', () => {
	let originalModule;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedDate);
		originalModule = globalThis.module;
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		globalThis.module = originalModule;
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('createLogger emits log entries for allowed levels', () => {
		const custom = createLogger('test');
		custom.info('hello', { data: 1 });
		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('[test] hello'),
			expect.objectContaining({ data: 1 })
		);

		custom.debug('hidden');
		expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('hidden'), expect.anything());

		logger.warn('global warning');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('[genproj] global warning'),
			expect.any(Object)
		);
	});

	it('authLogger emits auth prefixed messages', () => {
		authLogger.auth('login');
		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('[genproj:auth] login'),
			expect.any(Object)
		);
	});

	it('withTiming logs success and propagates result', async () => {
		const timed = withTiming(async () => {
			vi.advanceTimersByTime(50);
			return 'ok';
		}, 'operation', { extra: 'value' });

		await expect(timed()).resolves.toBe('ok');

		const successCall = console.log.mock.calls.find(([message]) => message.includes('Completed operation'));
		expect(successCall?.[1]).toMatchObject({ duration: '50ms', extra: 'value' });
	});

	it('withTiming logs failures and rethrows', async () => {
		const error = new Error('boom');
		const timed = withTiming(async () => {
			vi.advanceTimersByTime(25);
			throw error;
		}, 'operation');

		await expect(timed()).rejects.toThrow(error);
		const failureCall = console.error.mock.calls.find(([message]) => message.includes('Failed operation'));
		expect(failureCall?.[1]).toMatchObject({ duration: '25ms', error: 'boom' });
	});

	it('logApiCall differentiates success and failure', () => {
		logApiCall('GET', '/items', { id: 1 }, { ok: true }, 200, 10);
		const infoCall = console.log.mock.calls.find(([message]) => message.includes('API call: GET /items'));
		expect(infoCall?.[1]).toMatchObject({ statusCode: 200, duration: '10ms' });

		logApiCall('POST', '/items', { id: 1 }, { ok: false }, 500, 30);
		const errorCall = console.error.mock.calls.find(([message]) => message.includes('API call failed: POST /items'));
		expect(errorCall?.[1]).toMatchObject({ statusCode: 500, duration: '30ms' });
	});

	it('logUserAction, logSecurityEvent, and other helpers emit messages', () => {
		logUserAction('user-1', 'clicked', { page: 'home' });
		logSecurityEvent('login_failure', { userId: 'user-1' });
		logDatabaseOperation('insert', 'projects', { id: 1 });
		logFileOperation('write', '/tmp/file.txt');
		logSystemEvent('startup');

		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('User action: clicked'),
			expect.objectContaining({ userId: 'user-1' })
		);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Security event: login_failure'),
			expect.objectContaining({ userId: 'user-1' })
		);
	});

	it('setLogLevel adjusts log level without throwing', () => {
		expect(() => setLogLevel('DEBUG')).not.toThrow();
		const logCall = console.log.mock.calls.find(([message]) => message.includes('Log level set to: DEBUG'));
		expect(logCall).toBeDefined();
	});

	it('getLogLevel returns human readable level', () => {
		expect(getLogLevel()).toBe('INFO');
	});
});
