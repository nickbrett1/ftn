/**
 * Cryptographically secure utility functions
 * Used for security-critical operations like file keys and auth tokens
 */

/**
 * Generate a cryptographically secure random hex string
 * @param {number} byteLength - Number of random bytes to generate (default: 6)
 * @returns {string} Hex string of the specified length
 */
export function generateSecureRandomHex(byteLength = 6) {
	const randomBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure random string for auth tokens
 * Uses base36 encoding for better URL safety
 * @param {number} byteLength - Number of random bytes to generate (default: 20)
 * @returns {string} Base36 encoded random string
 */
export function generateSecureAuthToken(byteLength = 20) {
	const randomBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return Array.from(randomBytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
}