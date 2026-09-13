import { describe, it, expect, vi } from 'vitest';
import { getApiKeysDb, executeApiKeysQuery, getApiKeysFirstResult } from '$lib/server/db.js';

describe('db', () => {
	describe('getApiKeysDb', () => {
		it('should return the API_KEYS_DB binding if present', () => {
			const environment = { API_KEYS_DB: { fake: 'db' } };
			const database = getApiKeysDb(environment);
			expect(database).toBe(environment.API_KEYS_DB);
		});

		it('should throw an error if API_KEYS_DB binding is missing', () => {
			const environment = {};
			expect(() => getApiKeysDb(environment)).toThrow('API_KEYS_DB binding not found');
		});
	});

	describe('executeApiKeysQuery', () => {
		it('should execute a query and return results', async () => {
			const mockResults = [{ id: 1, name: 'test' }];
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const sql = 'SELECT * FROM users';
			const parameters = ['param1'];
			const results = await executeApiKeysQuery(mockDatabase, sql, parameters);

			expect(mockDatabase.prepare).toHaveBeenCalledWith(sql);
			expect(mockDatabase.bind).toHaveBeenCalledWith(...parameters);
			expect(mockDatabase.all).toHaveBeenCalled();
			expect(results).toBe(mockResults);
		});

		it('should throw an error if query execution fails', async () => {
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error('DB Error'))
			};

			await expect(executeApiKeysQuery(mockDatabase, 'SELECT * FROM users')).rejects.toThrow(
				'Database query failed: DB Error'
			);
		});
	});

	describe('getApiKeysFirstResult', () => {
		it('should return the first result if available', async () => {
			const mockResults = [
				{ id: 1, name: 'test' },
				{ id: 2, name: 'test2' }
			];
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const result = await getApiKeysFirstResult(mockDatabase, 'SELECT * FROM users');
			expect(result).toBe(mockResults[0]);
		});

		it('should return null if no results are available', async () => {
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] })
			};

			const result = await getApiKeysFirstResult(mockDatabase, 'SELECT * FROM users');
			expect(result).toBeNull();
		});

		it('should throw an error if query execution fails', async () => {
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error('DB Error'))
			};

			await expect(getApiKeysFirstResult(mockDatabase, 'SELECT * FROM users')).rejects.toThrow(
				'Database query failed: DB Error'
			);
		});
	});
});
