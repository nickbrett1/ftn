import { getGenprojDb, executeGenprojQuery, getGenprojFirstResult } from './db.js';

export class ApiKeyService {
	constructor(env) {
		this.db = getGenprojDb(env);
	}

	async initializeDatabase() {
		const sql = `
			CREATE TABLE IF NOT EXISTS ApiKeys (
				id TEXT PRIMARY KEY,
				user_email TEXT NOT NULL,
				hashed_key TEXT NOT NULL,
				name TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				last_used_at DATETIME
			);
		`;
		await executeGenprojQuery(this.db, sql);
	}

	async hashKey(key) {
		const encoder = new TextEncoder();
		const data = encoder.encode(key);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
		return hashHex;
	}

	generateKey() {
		return `pat_${crypto.randomUUID().replace(/-/g, '')}`;
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
			createdAt: row.createdAt ? new Date(row.createdAt.replace(' ', 'T') + 'Z').toISOString() : null,
			lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt.replace(' ', 'T') + 'Z').toISOString() : null
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
		if (!rawKey || !rawKey.startsWith('pat_')) {
			return null;
		}

		const hashedKey = await this.hashKey(rawKey);

		const sql = `
			SELECT id, user_email
			FROM ApiKeys
			WHERE hashed_key = ?
		`;
		const keyRecord = await getGenprojFirstResult(this.db, sql, [hashedKey]);

		if (keyRecord) {
			// Update last used timestamp
			const updateSql = `
				UPDATE ApiKeys
				SET last_used_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`;
			await executeGenprojQuery(this.db, updateSql, [keyRecord.id]);
			return keyRecord.user_email;
		}

		return null;
	}
}
