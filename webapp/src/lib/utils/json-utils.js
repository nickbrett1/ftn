/**
 * @fileoverview JSON utility functions
 * @description Provides safe JSON parsing capabilities, especially for devcontainer.json
 */

/**
 * Parses a devcontainer.json string, safely stripping comments before parsing.
 * This is a secure alternative to using regex which can be vulnerable to ReDoS.
 * @param {string|object} config - The devcontainer configuration string or object
 * @param {string} configName - The name of the configuration for error logging
 * @returns {object} The parsed configuration object
 * @throws {Error} If the configuration is invalid
 */
export function parseDevcontainerConfig(config, configName) {
	if (typeof config === 'object') {
		return config;
	}
	if (typeof config !== 'string') {
		throw new Error(`Invalid ${configName} devcontainer configuration type`);
	}
	try {
		// Securely strip comments without using vulnerable regex
		let jsonString = '';
		let inString = false;
		let inLineComment = false;
		let inBlockComment = false;
		for (let i = 0; i < config.length; i++) {
			const char = config[i];
			const nextChar = i + 1 < config.length ? config[i + 1] : '';

			if (inLineComment) {
				if (char === '\n') {
					inLineComment = false;
					jsonString += char; // Preserve line breaks
				}
				continue;
			}

			if (inBlockComment) {
				if (char === '*' && nextChar === '/') {
					inBlockComment = false;
					i++; // Skip the closing '/'
				}
				continue;
			}

			if (inString) {
				if (char === '\\') {
					jsonString += char + nextChar;
					i++; // Skip the escaped character
				} else {
					if (char === '"') {
						inString = false;
					}
					jsonString += char;
				}
				continue;
			}

			if (char === '/' && nextChar === '/') {
				inLineComment = true;
				i++; // Skip the second '/'
				continue;
			}

			if (char === '/' && nextChar === '*') {
				inBlockComment = true;
				i++; // Skip the '*'
				continue;
			}

			if (char === '"') {
				inString = true;
			}
			jsonString += char;
		}

		return JSON.parse(jsonString);
	} catch (e) {
		console.error(`Failed to parse ${configName} config:`, e);
		console.error('Config content:', config.substring(0, 200));
		throw new Error(`Invalid ${configName} devcontainer configuration`);
	}
}
