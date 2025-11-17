// webapp/src/lib/server/db.test.js
import { describe, it, expect, vi } from 'vitest';
import {
	getGenprojDb,
	executeGenprojQuery,
	getGenprojFirstResult
} from './db.js';

// Mock D1Database for testing
const mockDb = {
	prepare: vi.fn().mockReturnThis(),
	bind: vi.fn().mockReturnThis(),
	all: vi.fn()
};

describe('Database Utilities', () => {
	describe('getGenprojDb', () => {
		it('should return the D1 database binding when it exists', () => {
			const mockEnv = { GENPROJ_DB: mockDb };
			const db = getGenprojDb(mockEnv);
			expect(db).toBe(mockDb);
		});

		it('should throw an error if the D1 binding is not found', () => {
			const mockEnv = {};
			expect(() => getGenprojDb(mockEnv)).toThrow('GENPROJ_DB binding not found in environment.');
		});

        it('should throw an error if the environment is undefined', () => {
            expect(() => getGenprojDb(undefined)).toThrow('GENPROJ_DB binding not found in environment.');
        });
	});

	describe('executeGenprojQuery', () => {
		it('should execute a query and return results', async () => {
			const mockResults = [{ id: 1, name: 'Test' }];
			mockDb.all.mockResolvedValue({ results: mockResults });

			const sql = 'SELECT * FROM users';
			const results = await executeGenprojQuery(mockDb, sql);

			expect(mockDb.prepare).toHaveBeenCalledWith(sql);
			expect(mockDb.bind).toHaveBeenCalledWith();
			expect(results).toEqual(mockResults);
		});

		it('should execute a query with parameters', async () => {
			const mockResults = [{ id: 1, name: 'Test' }];
			mockDb.all.mockResolvedValue({ results: mockResults });

			const sql = 'SELECT * FROM users WHERE id = ?';
			const params = [1];
			const results = await executeGenprojQuery(mockDb, sql, params);

			expect(mockDb.prepare).toHaveBeenCalledWith(sql);
			expect(mockDb.bind).toHaveBeenCalledWith(...params);
			expect(results).toEqual(mockResults);
		});

		it('should throw an error if the query fails', async () => {
			const errorMessage = 'Query failed';
			mockDb.all.mockRejectedValue(new Error(errorMessage));

			const sql = 'SELECT * FROM users';
			await expect(executeGenprojQuery(mockDb, sql)).rejects.toThrow(
				`Database query failed: ${errorMessage}`
			);
		});
	});

	describe('getGenprojFirstResult', () => {
		it('should return the first result of a query', async () => {
			const mockResults = [{ id: 1, name: 'Test' }, { id: 2, name: 'Test 2' }];
			mockDb.all.mockResolvedValue({ results: mockResults });

			const sql = 'SELECT * FROM users';
			const result = await getGenprojFirstResult(mockDb, sql);

			expect(result).toEqual(mockResults[0]);
		});

		it('should return null if there are no results', async () => {
			mockDb.all.mockResolvedValue({ results: [] });

			const sql = 'SELECT * FROM users';
			const result = await getGenprojFirstResult(mockDb, sql);

			expect(result).toBeNull();
		});

		it('should throw an error if the query fails', async () => {
			const errorMessage = 'Query failed';
			mockDb.all.mockRejectedValue(new Error(errorMessage));

			const sql = 'SELECT * FROM users';
			await expect(getGenprojFirstResult(mockDb, sql)).rejects.toThrow(
				`Database query failed: ${errorMessage}`
			);
		});
	});
});
