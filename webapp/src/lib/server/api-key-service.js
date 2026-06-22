import { getGenprojDb as getGenprojDatabase, executeGenprojQuery, getGenprojFirstResult } from './db.js';

export class ApiKeyService {
	constructor(environment) {
		this.db = getGenprojDatabase(environment);
	}

	async initializeDatabase() {
		const sql = `
			CREATE TABLE IF NOT EXISTS ApiKeys (
				id TEXT PRIMARY KEY,
				user_email TEXT NOT NULL,
				hashed_key TEXT NOT NULL,
				name TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				last_used_at DATETIME,
				rate_limit_count INTEGER DEFAULT 0,
				rate_limit_reset_at DATETIME
			);
		`;
		await executeGenprojQuery(this.db, sql);

		// Try to add columns to existing table if they don't exist
		try {
			await executeGenprojQuery(this.db, `ALTER TABLE ApiKeys ADD COLUMN rate_limit_count INTEGER DEFAULT 0`);
			await executeGenprojQuery(this.db, `ALTER TABLE ApiKeys ADD COLUMN rate_limit_reset_at DATETIME`);
		} catch {
			// Columns likely already exist
		}
	}

	async hashKey(key) {
		const encoder = new TextEncoder();
		const data = encoder.encode(key);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = [...new Uint8Array(hashBuffer)];
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
		return hashHex;
	}

	generateKey() {
		return `pat_${crypto.randomUUID().replaceAll('-', '')}`;
	}

	async createKey(userEmail, name) {
		const checkSql = `
			SELECT id FROM ApiKeys WHERE user_email = ? AND name = ?
		`;
		const existing = await getGenprojFirstResult(this.db, checkSql, [userEmail, name]);
		if (existing) {
			throw new Error('An API key with this name already exists');
		}

		const rawKey = this.generateKey();
		const hashedKey = await this.hashKey(rawKey);
		const id = crypto.randomUUID();

		const sql = `
			INSERT INTO ApiKeys (id, user_email, hashed_key, name)
			VALUES (?, ?, ?, ?)
		`;
		await executeGenprojQuery(this.db, sql, [id, userEmail, hashedKey, name]);

		return {
			id,
			name,
			rawKey,
			createdAt: new Date().toISOString()
		};
	}

	async getKeysForUser(userEmail) {
		const sql = `
			SELECT id, name, created_at as createdAt, last_used_at as lastUsedAt
			FROM ApiKeys
			WHERE user_email = ?
			ORDER BY created_at DESC
		`;
		const results = await executeGenprojQuery(this.db, sql, [userEmail]);
		return results.map((row) => ({
			...row,
			createdAt: row.createdAt ? new Date(row.createdAt.replace(' ', 'T') + 'Z').toISOString() : undefined,
			lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt.replace(' ', 'T') + 'Z').toISOString() : undefined
		}));
	}

	async revokeKey(id, userEmail) {
		const sql = `
			DELETE FROM ApiKeys
			WHERE id = ? AND user_email = ?
		`;
		await executeGenprojQuery(this.db, sql, [id, userEmail]);
	}

	async validateKey(rawKey) {
		if (!rawKey?.startsWith('pat_')) {
			return;
		}

		const hashedKey = await this.hashKey(rawKey);

		const sql = `
			SELECT id, user_email, rate_limit_count, rate_limit_reset_at
			FROM ApiKeys
			WHERE hashed_key = ?
		`;
		const keyRecord = await getGenprojFirstResult(this.db, sql, [hashedKey]);

		if (keyRecord) {
			const now = new Date();
			let count = keyRecord.rate_limit_count || 0;
			let resetAt = keyRecord.rate_limit_reset_at ? new Date(keyRecord.rate_limit_reset_at.replace(' ', 'T') + 'Z') : new Date(0);

			// Reset the counter if the reset time has passed (1 minute window)
			if (now >= resetAt) {
				count = 0;
				resetAt = new Date(now.getTime() + 60 * 1000); // Reset in 1 minute
			}

			if (count >= 100) { // Limit to 100 requests per minute
				throw new Error('Rate limit exceeded');
			}

			// Update last used timestamp and rate limit counters
			const updateSql = `
				UPDATE ApiKeys
				SET last_used_at = CURRENT_TIMESTAMP,
					rate_limit_count = ?,
					rate_limit_reset_at = ?
				WHERE id = ?
			`;
			await executeGenprojQuery(this.db, updateSql, [count + 1, resetAt.toISOString().replace('T', ' ').replace('Z', ''), keyRecord.id]);

			return keyRecord.user_email;
		}
	}
}
