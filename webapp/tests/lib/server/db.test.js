import { describe, it, expect, vi } from 'vitest';
import { getGenprojDb, executeGenprojQuery, getGenprojFirstResult } from '$lib/server/db.js';

describe('db', () => {
	describe('getGenprojDb', () => {
		it('should return the GENPROJ_DB binding if present', () => {
			const environment = { GENPROJ_DB: { fake: 'db' } };
			const database = getGenprojDb(environment);
			expect(database).toBe(environment.GENPROJ_DB);
		});

		it('should throw an error if GENPROJ_DB binding is missing', () => {
			const environment = {};
			expect(() => getGenprojDb(environment)).toThrow('GENPROJ_DB binding not found');
		});
	});

	describe('executeGenprojQuery', () => {
		it('should execute a query and return results', async () => {
			const mockResults = [{ id: 1, name: 'test' }];
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const sql = 'SELECT * FROM users';
			const parameters = ['param1'];
			const results = await executeGenprojQuery(mockDatabase, sql, parameters);

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

			await expect(executeGenprojQuery(mockDatabase, 'SELECT * FROM users')).rejects.toThrow(
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
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults })
			};

			const result = await getGenprojFirstResult(mockDatabase, 'SELECT * FROM users');
			expect(result).toBe(mockResults[0]);
		});

		it('should return null if no results are available', async () => {
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] })
			};

			const result = await getGenprojFirstResult(mockDatabase, 'SELECT * FROM users');
			expect(result).toBeNull();
		});

		it('should throw an error if query execution fails', async () => {
			const mockDatabase = {
				prepare: vi.fn().mockReturnThis(),
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockRejectedValue(new Error('DB Error'))
			};

			await expect(getGenprojFirstResult(mockDatabase, 'SELECT * FROM users')).rejects.toThrow(
				'Database query failed: DB Error'
			);
		});
	});
});
