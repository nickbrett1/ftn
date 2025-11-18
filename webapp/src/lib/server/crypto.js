// webapp/src/lib/server/crypto.js
import { webcrypto } from 'node:crypto';
import { SECRET_KEY } from '$env/static/private';
import { logError } from '$lib/utils/logging';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES-256-GCM
const TAG_LENGTH = 16; // 16 bytes for authentication tag

// Derive a fixed-size key from the SECRET_KEY environment variable
async function getKey() {
	if (!SECRET_KEY) {
		logError('SECRET_KEY environment variable is not set. Encryption will fail.', 'CRYPTO');
		throw new Error('SECRET_KEY is not set.');
	}
	const encoder = new TextEncoder();
	const keyMaterial = await webcrypto.subtle.digest('SHA-256', encoder.encode(SECRET_KEY));
	return await webcrypto.subtle.importKey('raw', keyMaterial, ALGORITHM, false, [
		'encrypt',
		'decrypt'
	]);
}

let encryptionKey = null;

async function getOrCreateKey() {
	if (!encryptionKey) {
		encryptionKey = await getKey();
	}
	return encryptionKey;
}

/**
 * Encrypts a given text using AES-256-GCM.
 * @param {string} text - The text to encrypt.
 * @returns {Promise<string>} The encrypted text as a base64 string.
 */
export async function encrypt(text) {
	try {
		const key = await getOrCreateKey();
		const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
		const encodedText = new TextEncoder().encode(text);

		const cipher = await webcrypto.subtle.encrypt({ name: ALGORITHM, iv: iv }, key, encodedText);

		const cipherArray = new Uint8Array(cipher);
		const result = new Uint8Array(iv.length + cipherArray.length);
		result.set(iv, 0);
		result.set(cipherArray, iv.length);

		return Buffer.from(result).toString('base64');
	} catch (error) {
		logError(`Encryption failed: ${error.message}`, 'CRYPTO', error);
		throw error;
	}
}

/**
 * Decrypts a given base64 encoded string using AES-256-GCM.
 * @param {string} encryptedText - The base64 encoded encrypted text.
 * @returns {Promise<string>} The decrypted text.
 */
export async function decrypt(encryptedText) {
	try {
		const key = await getOrCreateKey();
		const buffer = Buffer.from(encryptedText, 'base64');

		const iv = buffer.slice(0, IV_LENGTH);
		const cipherText = buffer.slice(IV_LENGTH);

		const decipher = await webcrypto.subtle.decrypt({ name: ALGORITHM, iv: iv }, key, cipherText);

		return new TextDecoder().decode(decipher);
	} catch (error) {
		logError(`Decryption failed: ${error.message}`, 'CRYPTO', error);
		throw error;
	}
}
