import {
	getApiKeysDb as getApiKeysDatabase,
	executeApiKeysQuery,
	getApiKeysFirstResult
} from './db.js';

/**
 * The credential kinds that share the `ApiKeys` table. See
 * `scripts/migrations/0001_add_api_key_kind_api-keys.sql` for how the column was
 * introduced.
 *
 * 'user' is a token a signed-in person created for themselves; 'api' is a token
 * held by a non-human caller, such as an MCP client. Authentication treats the
 * two identically — the distinction exists so the UI can label them and so a
 * token's provenance is not lost.
 */
export const KEY_KINDS = {
	USER: 'user',
	API: 'api'
};

export class ApiKeyService {
	constructor(environment) {
		this.db = getApiKeysDatabase(environment);
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

	async createKey(userEmail, name, kind = KEY_KINDS.USER) {
		const checkSql = `
			SELECT id FROM ApiKeys WHERE user_email = ? AND name = ?
		`;
		const existing = await getApiKeysFirstResult(this.db, checkSql, [userEmail, name]);
		if (existing) {
			throw new Error('An API key with this name already exists');
		}

		const rawKey = this.generateKey();
		const hashedKey = await this.hashKey(rawKey);
		const id = crypto.randomUUID();

		const sql = `
			INSERT INTO ApiKeys (id, user_email, hashed_key, name, kind)
			VALUES (?, ?, ?, ?, ?)
		`;
		await executeApiKeysQuery(this.db, sql, [id, userEmail, hashedKey, name, kind]);

		return {
			id,
			name,
			kind,
			rawKey,
			createdAt: new Date().toISOString()
		};
	}

	async getKeysForUser(userEmail) {
		const sql = `
			SELECT id, name, kind, created_at as createdAt, last_used_at as lastUsedAt, rate_limit_count
			FROM ApiKeys
			WHERE user_email = ?
			ORDER BY created_at DESC
		`;
		const results = await executeApiKeysQuery(this.db, sql, [userEmail]);
		return results.map((row) => ({
			...row,
			kind: row.kind || KEY_KINDS.USER,
			createdAt: row.createdAt
				? new Date(row.createdAt.replace(' ', 'T') + 'Z').toISOString()
				: undefined,
			lastUsedAt: row.lastUsedAt
				? new Date(row.lastUsedAt.replace(' ', 'T') + 'Z').toISOString()
				: undefined
		}));
	}

	async revokeKey(id, userEmail) {
		const sql = `
			DELETE FROM ApiKeys
			WHERE id = ? AND user_email = ?
		`;
		await executeApiKeysQuery(this.db, sql, [id, userEmail]);
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
		const keyRecord = await getApiKeysFirstResult(this.db, sql, [hashedKey]);

		if (keyRecord) {
			const now = new Date();
			let count = keyRecord.rate_limit_count || 0;
			let resetAt = keyRecord.rate_limit_reset_at
				? new Date(keyRecord.rate_limit_reset_at.replace(' ', 'T') + 'Z')
				: new Date(0);

			// Reset the counter if the reset time has passed (1 minute window)
			if (now >= resetAt) {
				count = 0;
				resetAt = new Date(now.getTime() + 60 * 1000); // Reset in 1 minute
			}

			if (count >= 100) {
				// Limit to 100 requests per minute
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
			await executeApiKeysQuery(this.db, updateSql, [
				count + 1,
				resetAt.toISOString().replace('T', ' ').replace('Z', ''),
				keyRecord.id
			]);

			return keyRecord.user_email;
		}
	}
}
