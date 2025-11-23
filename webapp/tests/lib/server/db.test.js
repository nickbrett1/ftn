import { describe, it, expect, vi } from 'vitest';
import { getGenprojDb, executeGenprojQuery, getGenprojFirstResult } from '$lib/server/db.js';

describe('db', () => {
	describe('getGenprojDb', () => {
		it('should return the GENPROJ_DB binding if present', () => {
			const env = { GENPROJ_DB: { fake: 'db' } };
			const db = getGenprojDb(env);
			expect(db).toBe(env.GENPROJ_DB);
		});

		it('should throw an error if GENPROJ_DB binding is missing', () => {
			const env = {};
			expect(() => getGenprojDb(env)).toThrow('GENPROJ_DB binding not found');
		});
	});

	describe('executeGenprojQuery', () => {
		it('should execute a query and return results', async () => {
			const mockResults = [{ id: 1, name: 'test' }];
			const mockDb = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const sql = 'SELECT * FROM users';
			const params = ['param1'];
			const results = await executeGenprojQuery(mockDb, sql, params);

			expect(mockDb.prepare).toHaveBeenCalledWith(sql);
			expect(mockDb.bind).toHaveBeenCalledWith(...params);
			expect(mockDb.all).toHaveBeenCalled();
			expect(results).toBe(mockResults);
		});

		it('should throw an error if query execution fails', async () => {
			const mockDb = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error('DB Error'))
			};

			await expect(executeGenprojQuery(mockDb, 'SELECT * FROM users')).rejects.toThrow(
				'Database query failed: DB Error'
			);
		});
	});

	describe('getGenprojFirstResult', () => {
		it('should return the first result if available', async () => {
			const mockResults = [
				{ id: 1, name: 'test' },
				{ id: 2, name: 'test2' }
			];
			const mockDb = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const result = await getGenprojFirstResult(mockDb, 'SELECT * FROM users');
			expect(result).toBe(mockResults[0]);
		});

		it('should return null if no results are available', async () => {
			const mockDb = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] })
			};

			const result = await getGenprojFirstResult(mockDb, 'SELECT * FROM users');
			expect(result).toBeNull();
		});

		it('should throw an error if query execution fails', async () => {
			const mockDb = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error('DB Error'))
			};

			await expect(getGenprojFirstResult(mockDb, 'SELECT * FROM users')).rejects.toThrow(
				'Database query failed: DB Error'
			);
		});
	});
});
