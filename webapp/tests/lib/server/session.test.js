import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createSession,
	validateSession,
	invalidateSession,
	invalidateAllSessions,
	setSessionCookie,
	deleteSessionCookie
} from '$lib/server/session.js';

describe('session', () => {
	let mockKv;
	let mockCookies;

	beforeEach(() => {
		mockKv = {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn()
		};
		mockCookies = {
			set: vi.fn()
		};

		// Mock crypto.getRandomValues
		if (!globalThis.crypto) {
			globalThis.crypto = {};
		}
		if (!globalThis.crypto.getRandomValues) {
			globalThis.crypto.getRandomValues = vi.fn((array) => {
				for (let index = 0; index < array.length; index++) {
					array[index] = index % 256;
				}
				return array;
			});
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createSession', () => {
		it('should create a session and store it in KV', async () => {
			const userId = 'user123';
			const session = await createSession(mockKv, userId);

			expect(session.userId).toBe(userId);
			expect(session.id).toBeDefined();
			expect(session.expiresAt).toBeInstanceOf(Date);

			expect(mockKv.put).toHaveBeenCalledTimes(2); // Session + UserSessions
			expect(mockKv.put).toHaveBeenCalledWith(
				`session:${session.id}`,
				expect.stringContaining(userId),
				expect.objectContaining({ expirationTtl: expect.any(Number) })
			);
		});
	});

	describe('validateSession', () => {
		it('should return valid session if found and not expired', async () => {
			const sessionId = 'session123';
			const userId = 'user123';
			const expiresAt = new Date(Date.now() + 100_000);

			mockKv.get.mockResolvedValueOnce(JSON.stringify({ userId, expiresAt: expiresAt.getTime() }));

			const session = await validateSession(mockKv, sessionId);
			expect(session).not.toBeNull();
			expect(session.userId).toBe(userId);
		});

		it('should return null if session not found', async () => {
			mockKv.get.mockResolvedValueOnce(null);
			const session = await validateSession(mockKv, 'nonexistent');
			expect(session).toBeNull();
		});

		it('should delete expired session and return null', async () => {
			const sessionId = 'session123';
			const userId = 'user123';
			const expiresAt = new Date(Date.now() - 1000); // Expired

			mockKv.get.mockResolvedValueOnce(JSON.stringify({ userId, expiresAt: expiresAt.getTime() }));
			mockKv.get.mockResolvedValueOnce('[]'); // userSessions

			const session = await validateSession(mockKv, sessionId);
			expect(session).toBeNull();
			expect(mockKv.delete).toHaveBeenCalledWith(`session:${sessionId}`);
		});
	});

	describe('invalidateSession', () => {
		it('should delete session from KV', async () => {
			const sessionId = 'session123';
			const userId = 'user123';

			mockKv.get.mockResolvedValueOnce(JSON.stringify({ userId, expiresAt: Date.now() }));
			mockKv.get.mockResolvedValueOnce('["session123"]'); // userSessions

			await invalidateSession(mockKv, sessionId);
			expect(mockKv.delete).toHaveBeenCalledWith(`session:${sessionId}`);
		});
	});

	describe('invalidateAllSessions', () => {
		it('should delete all sessions for a user', async () => {
			const userId = 'user123';
			const sessions = ['s1', 's2'];

			mockKv.get.mockResolvedValueOnce(JSON.stringify(sessions));

			await invalidateAllSessions(mockKv, userId);
			expect(mockKv.delete).toHaveBeenCalledWith('session:s1');
			expect(mockKv.delete).toHaveBeenCalledWith('session:s2');
			expect(mockKv.delete).toHaveBeenCalledWith(`user_sessions:${userId}`);
		});
	});

	describe('setSessionCookie', () => {
		it('should set session cookie', () => {
			const sessionId = 's1';
			const expiresAt = new Date();
			setSessionCookie(mockCookies, sessionId, expiresAt, true);
			expect(mockCookies.set).toHaveBeenCalledWith(
				'session',
				sessionId,
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					expires: expiresAt
				})
			);
		});
	});

	describe('deleteSessionCookie', () => {
		it('should delete session cookie', () => {
			deleteSessionCookie(mockCookies, true);
			expect(mockCookies.set).toHaveBeenCalledWith(
				'session',
				'',
				expect.objectContaining({
					maxAge: 0
				})
			);
		});
	});
});
