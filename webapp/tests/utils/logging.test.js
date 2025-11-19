import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
	createLogger,
	logger,
	authLogger,
	withTiming,
	logApiCall,
	logUserAction,
	logSecurityEvent,
	setLogLevel,
	getLogLevel
} from '$lib/utils/logging.js';

const fixedDate = new Date('2024-01-01T00:00:00.000Z');

describe('logging utilities', () => {
	let originalLogLevel;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedDate);
		originalLogLevel = getLogLevel();
		setLogLevel('DEBUG'); // Set a predictable log level for tests
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		setLogLevel(originalLogLevel);
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('createLogger emits log entries for allowed levels', () => {
		const custom = createLogger('test');
		setLogLevel('INFO');
		console.log.mockClear();
		custom.info('hello', { data: 1 });

		const logOutput = console.log.mock.calls[0][0];
		expect(logOutput).toContain('[test] hello');

		custom.debug('hidden');
		const logOutputHidden = console.log.mock.calls.flat().join('');
		expect(logOutputHidden).not.toContain('hidden');

		setLogLevel('DEBUG');
		console.log.mockClear();
		custom.debug('visible');
		const logOutputVisible = console.log.mock.calls.flat().join('');
		expect(logOutputVisible).toContain('[test] visible');

		logger.warn('global warning');
		const warnOutput = console.warn.mock.calls[0][0];
		expect(warnOutput).toContain('[genproj] global warning');
	});

	it('authLogger emits auth prefixed messages', () => {
		authLogger.auth('login');
		const logOutput = console.log.mock.calls[0][0];
		expect(logOutput).toContain('[genproj:auth] login');
	});

	it('withTiming logs success and propagates result', async () => {
		const timed = withTiming(
			async () => {
				vi.advanceTimersByTime(50);
				return 'ok';
			},
			'operation',
			{ extra: 'value' }
		);

		await expect(timed()).resolves.toBe('ok');

		const successCall = console.log.mock.calls.find(([message]) =>
			message.includes('Completed operation')
		);
		expect(successCall).toBeDefined();
		expect(successCall[1]).toMatchObject({ duration: '50ms', extra: 'value' });
	});

	it('withTiming logs failures and rethrows', async () => {
		const error = new Error('boom');
		const timed = withTiming(async () => {
			vi.advanceTimersByTime(25);
			throw error;
		}, 'operation');

		await expect(timed()).rejects.toThrow(error);
		const failureCall = console.error.mock.calls.find(([message]) =>
			message.includes('Failed operation')
		);
		expect(failureCall).toBeDefined();
		expect(failureCall[1]).toMatchObject({ duration: '25ms', error: 'boom' });
	});

	it('logApiCall differentiates success and failure', () => {
		logApiCall('GET', '/items', { id: 1 }, { ok: true }, 200, 10);
		const infoCall = console.log.mock.calls.find(([message]) =>
			message.includes('API call: GET /items')
		);
		expect(infoCall).toBeDefined();
		if (infoCall) {
			expect(infoCall[1]).toMatchObject({ statusCode: 200, duration: '10ms' });
		}

		logApiCall('POST', '/items', { id: 1 }, { ok: false }, 500, 30);
		const errorCall = console.error.mock.calls.find(([message]) =>
			message.includes('API call failed: POST /items')
		);
		expect(errorCall).toBeDefined();
		if (errorCall) {
			expect(errorCall[1]).toMatchObject({ statusCode: 500, duration: '30ms' });
		}
	});

	it('logUserAction, logSecurityEvent, and other helpers emit messages', () => {
		logUserAction('user-1', 'clicked', { page: 'home' });
		logUserAction('user-1', 'clicked', { page: 'home' });
		const logOutput = console.log.mock.calls.flat().join('');
		expect(logOutput).toContain('User action: clicked');
		logSecurityEvent('login_failure', { userId: 'user-1' });
		const warnOutput = console.warn.mock.calls.flat().join('');
		expect(warnOutput).toContain('Security event: login_failure');
	});

	it('setLogLevel adjusts log level without throwing', () => {
		console.log.mockClear();
		expect(() => setLogLevel('INFO')).not.toThrow();
		const logCall = console.log.mock.calls.find(([message]) =>
			message.includes('Log level set to: INFO')
		);
		expect(logCall).toBeDefined();
	});

	it('getLogLevel returns human readable level', () => {
		setLogLevel('INFO');
		expect(getLogLevel()).toBe('INFO');
		setLogLevel('DEBUG');
		expect(getLogLevel()).toBe('DEBUG');
	});

	it('category-specific logger methods route to appropriate consoles', () => {
		const custom = createLogger('categories');

		console.log.mockClear();
		custom.database('query', { table: 'projects' });
		let logOutput = console.log.mock.calls.flat().join('');
		expect(logOutput).toContain('[categories] query');

		console.log.mockClear();
		custom.api('request', { path: '/api' });
		logOutput = console.log.mock.calls.flat().join('');
		expect(logOutput).toContain('[categories] request');

		console.warn.mockClear();
		custom.security('breach', { severity: 'high' });
		const warnOutput = console.warn.mock.calls.flat().join('');
		expect(warnOutput).toContain('[categories] breach');
	});
});
