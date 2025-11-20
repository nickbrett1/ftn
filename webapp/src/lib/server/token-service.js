// webapp/src/lib/server/token-service.js

import { logError, log } from '$lib/utils/logging';
import { encrypt, decrypt } from '$lib/server/crypto.js'; // Assuming crypto utilities exist

export class TokenService {
	constructor(d1) {
		this.d1 = d1;
		log('TokenService initialized', 'TOKEN');
	}

	/**
	 * Stores an encrypted authentication token for a user and external service.
	 * @param {string} userId
	 * @param {string} serviceName
	 * @param {string} accessToken
	 * @param {string | null} refreshToken
	 * @param {Date | null} expiresAt
	 * @param {Date | null} refreshTokenExpiresAt
	 * @returns {Promise<boolean>}
	 */
	async storeToken(
		userId,
		serviceName,
		accessToken,
		refreshToken = null,
		expiresAt = null,
		refreshTokenExpiresAt = null
	) {
		try {
			const encryptedAccessToken = await encrypt(accessToken);
			const encryptedRefreshToken = refreshToken ? await encrypt(refreshToken) : null;

			const { success } = await this.d1
				.prepare(
					`INSERT INTO UserStoredAuthToken (id, userId, serviceName, encryptedToken, encryptedRefreshToken, createdAt, updatedAt, expiresAt, refreshTokenExpiresAt, isRevoked)
                 VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(userId, serviceName) DO UPDATE SET
                    encryptedToken = EXCLUDED.encryptedToken,
                    encryptedRefreshToken = EXCLUDED.encryptedRefreshToken,
                    updatedAt = EXCLUDED.updatedAt,
                    expiresAt = EXCLUDED.expiresAt,
                    refreshTokenExpiresAt = EXCLUDED.refreshTokenExpiresAt,
                    isRevoked = FALSE;`
				)
				.bind(
					userId,
					serviceName,
					encryptedAccessToken,
					encryptedRefreshToken,
					new Date().toISOString(),
					new Date().toISOString(),
					expiresAt ? expiresAt.toISOString() : null,
					refreshTokenExpiresAt ? refreshTokenExpiresAt.toISOString() : null
				)
				.run();

			if (success) {
				log(`Token stored/updated for user ${userId}, service ${serviceName}`, 'TOKEN');
			} else {
				logError(
					`Failed to store/update token for user ${userId}, service ${serviceName}`,
					'TOKEN'
				);
			}
			return success;
		} catch (error) {
			logError(
				`Error storing token for user ${userId}, service ${serviceName}: ${error.message}`,
				'TOKEN',
				error
			);
			return false;
		}
	}

	/**
	 * Retrieves all stored tokens for a given user.
	 * Decrypts the tokens before returning.
	 * @param {string} userId
	 * @returns {Promise<Array<object>>}
	 */
	async getTokensByUserId(userId) {
		try {
			const { results } = await this.d1
				.prepare(`SELECT * FROM UserStoredAuthToken WHERE userId = ? AND isRevoked = FALSE;`)
				.bind(userId)
				.all();

			const decryptedTokens = await Promise.all(
				results.map(async (row) => {
					const decryptedAccessToken = await decrypt(row.encryptedToken);
					const decryptedRefreshToken = row.encryptedRefreshToken
						? await decrypt(row.encryptedRefreshToken)
						: null;
					return {
						...row,
						accessToken: decryptedAccessToken,
						refreshToken: decryptedRefreshToken,
						encryptedToken: undefined, // Remove encrypted version
						encryptedRefreshToken: undefined // Remove encrypted version
					};
				})
			);
			log(`Retrieved ${decryptedTokens.length} tokens for user ${userId}`, 'TOKEN');
			return decryptedTokens;
		} catch (error) {
			logError(`Error retrieving tokens for user ${userId}: ${error.message}`, 'TOKEN', error);
			return [];
		}
	}

	/**
	 * Retrieves a single token for a given user and service.
	 * @param {string} userId
	 * @param {string} serviceName
	 * @returns {Promise<object | null>}
	 */
	async getToken(userId, serviceName) {
		try {
			const { results } = await this.d1
				.prepare(
					`SELECT * FROM UserStoredAuthToken WHERE userId = ? AND serviceName = ? AND isRevoked = FALSE;`
				)
				.bind(userId, serviceName)
				.all();

			if (results.length > 0) {
				const row = results[0];
				const decryptedAccessToken = await decrypt(row.encryptedToken);
				const decryptedRefreshToken = row.encryptedRefreshToken
					? await decrypt(row.encryptedRefreshToken)
					: null;
				log(`Retrieved token for user ${userId}, service ${serviceName}`, 'TOKEN');
				return {
					...row,
					accessToken: decryptedAccessToken,
					refreshToken: decryptedRefreshToken,
					encryptedToken: undefined,
					encryptedRefreshToken: undefined
				};
			}
			log(`No active token found for user ${userId}, service ${serviceName}`, 'TOKEN');
			return null;
		} catch (error) {
			logError(
				`Error retrieving token for user ${userId}, service ${serviceName}: ${error.message}`,
				'TOKEN',
				error
			);
			return null;
		}
	}

	/**
	 * Lists token services for a user, including their status (active, expired, revoked).
	 * Does not return the actual tokens.
	 * @param {string} userId
	 * @returns {Promise<Array<object>>}
	 */
	async listUserTokenServices(userId) {
		try {
			const { results } = await this.d1
				.prepare(
					`SELECT serviceName, expiresAt, isRevoked FROM UserStoredAuthToken WHERE userId = ?;`
				)
				.bind(userId)
				.all();

			const now = new Date();
			const tokenServices = results.map((row) => ({
				serviceName: row.serviceName,
				hasToken: !row.isRevoked,
				isExpired: row.expiresAt ? new Date(row.expiresAt) < now : false,
				isRevoked: row.isRevoked,
				expiresAt: row.expiresAt
			}));
			log(`Listed ${tokenServices.length} token services for user ${userId}`, 'TOKEN');
			return tokenServices;
		} catch (error) {
			logError(`Error listing token services for user ${userId}: ${error.message}`, 'TOKEN', error);
			return [];
		}
	}

	/**
	 * Revokes a stored token for a user and service.
	 * @param {string} userId
	 * @param {string} serviceName
	 * @returns {Promise<boolean>}
	 */
	async revokeUserToken(userId, serviceName) {
		try {
			const { success } = await this.d1
				.prepare(
					`UPDATE UserStoredAuthToken SET isRevoked = TRUE, updatedAt = ? WHERE userId = ? AND serviceName = ?;`
				)
				.bind(new Date().toISOString(), userId, serviceName)
				.run();

			if (success) {
				log(`Token revoked for user ${userId}, service ${serviceName}`, 'TOKEN');
			} else {
				logError(`Failed to revoke token for user ${userId}, service ${serviceName}`, 'TOKEN');
			}
			return success;
		} catch (error) {
			logError(
				`Error revoking token for user ${userId}, service ${serviceName}: ${error.message}`,
				'TOKEN',
				error
			);
			return false;
		}
	}
}
