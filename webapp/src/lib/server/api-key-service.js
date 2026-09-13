import {
	getApiKeysDb as getApiKeysDatabase,
	executeApiKeysQuery,
	getApiKeysFirstResult
} from './db.js';

/**
 * The credential kinds that share the `ApiKeys` table. See
 * `migrations/0001_add_api_key_kind_api-keys.sql` for what each means.
 */
export const KEY_KINDS = {
	USER: 'user',
	API: 'api',
	SYSTEM: 'system'
};

/**
 * Name of the per-user credential ftn provisions for itself. It is what ftn's
 * server routes present to the genproj Worker when they are acting on behalf of
 * the user who is logged in. One per user, so the name is fixed.
 */
export const SYSTEM_KEY_NAME = 'Managed by ftn';

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

	/**
	 * Returns the credential ftn uses to call other services as `userEmail`,
	 * creating it if it is not there yet.
	 *
	 * Idempotent by design: this runs on every sign-in, so it must be safe to
	 * call repeatedly. The generated `rawKey` is only returned when the row was
	 * created — the store keeps hashes, so an existing credential cannot be
	 * read back. Callers that need the value again must rotate it.
	 *
	 * @returns {Promise<{id: string, name: string, kind: string, created: boolean, rawKey: string|null}>}
	 */
	async ensureSystemKey(userEmail) {
		const sql = `
			SELECT id FROM ApiKeys WHERE user_email = ? AND name = ?
		`;
		const existing = await getApiKeysFirstResult(this.db, sql, [userEmail, SYSTEM_KEY_NAME]);
		if (existing) {
			return {
				id: existing.id,
				name: SYSTEM_KEY_NAME,
				kind: KEY_KINDS.SYSTEM,
				created: false,
				rawKey: null
			};
		}

		const created = await this.createKey(userEmail, SYSTEM_KEY_NAME, KEY_KINDS.SYSTEM);
		return { ...created, created: true };
	}

	/**
	 * Issues a fresh value for an existing 'system' credential, invalidating the
	 * previous one. This is the remedy when a system credential may have leaked:
	 * unlike a user's own PAT it cannot simply be deleted, because ftn's routes
	 * depend on it.
	 *
	 * Only 'system' keys can be rotated — rotating a key a human holds would
	 * break them silently, whereas they can delete and recreate their own.
	 *
	 * @returns {Promise<{id: string, name: string, kind: string, rawKey: string}>}
	 */
	async rotateSystemKey(id, userEmail) {
		const findSql = `
			SELECT id, name, kind FROM ApiKeys WHERE id = ? AND user_email = ?
		`;
		const key = await getApiKeysFirstResult(this.db, findSql, [id, userEmail]);
		if (!key) {
			throw new Error('API key not found');
		}
		if (key.kind !== KEY_KINDS.SYSTEM) {
			throw new Error('Only system-managed keys can be rotated');
		}

		const rawKey = this.generateKey();
		const hashedKey = await this.hashKey(rawKey);

		// Bumping `rotation` alongside the hash means a stale copy of the old
		// value is invalid even if the hash update were to be replayed.
		const updateSql = `
			UPDATE ApiKeys
			SET hashed_key = ?, rotation = rotation + 1, last_used_at = NULL
			WHERE id = ? AND user_email = ?
		`;
		await executeApiKeysQuery(this.db, updateSql, [hashedKey, id, userEmail]);

		return { id, name: key.name, kind: key.kind, rawKey };
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
		const findSql = `
			SELECT kind FROM ApiKeys WHERE id = ? AND user_email = ?
		`;
		const key = await getApiKeysFirstResult(this.db, findSql, [id, userEmail]);
		if (key && key.kind === KEY_KINDS.SYSTEM) {
			// System keys back ftn's own calls, so deleting one from the UI would
			// break the user's session for anything served by genproj. Rotate it
			// instead.
			throw new Error('System-managed keys cannot be deleted — rotate them instead');
		}

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
