/**
 * @fileoverview JSON utility functions
 * @description Provides safe JSON parsing capabilities, especially for devcontainer.json
 */

/**
 * @typedef {Object} ParserState
 * @property {string} jsonString - The resulting string being built.
 * @property {boolean} inString - Whether the parser is currently inside a string literal.
 * @property {boolean} inLineComment - Whether the parser is currently inside a single-line comment.
 * @property {boolean} inBlockComment - Whether the parser is currently inside a block comment.
 * @property {number} i - The current index in the loop.
 */

/**
 * Handles the state when the parser is inside a single-line comment.
 * @param {string} char - The current character.
 * @param {ParserState} state - The current state of the parser.
 */
function handleLineComment(char, state) {
	if (char === '\n') {
		state.inLineComment = false;
		state.jsonString += char; // Preserve line breaks
	}
}

/**
 * Handles the state when the parser is inside a block comment.
 * @param {string} char - The current character.
 * @param {string} nextChar - The next character in the string.
 * @param {ParserState} state - The current state of the parser.
 */
function handleBlockComment(char, nextChar, state) {
	if (char === '*' && nextChar === '/') {
		state.inBlockComment = false;
		state.i++; // Deliberately increment to skip the closing '/'
	}
}

/**
 * Handles the state when the parser is inside a string literal.
 * @param {string} char - The current character.
 * @param {string} nextChar - The next character in the string.
 * @param {ParserState} state - The current state of the parser.
 */
function handleInString(char, nextChar, state) {
	if (char === '\\') {
		state.jsonString += char + nextChar;
		state.i++; // Deliberately increment to skip the escaped character
	} else {
		if (char === '"') {
			state.inString = false;
		}
		state.jsonString += char;
	}
}

/**
 * Handles the default state when the parser is not in a string or comment.
 * @param {string} char - The current character.
 * @param {string} nextChar - The next character in the string.
 * @param {ParserState} state - The current state of the parser.
 */
function handleDefaultState(char, nextChar, state) {
	if (char === '/' && nextChar === '/') {
		state.inLineComment = true;
		state.i++; // Deliberately increment to skip the second '/'
	} else if (char === '/' && nextChar === '*') {
		state.inBlockComment = true;
		state.i++; // Deliberately increment to skip the '*'
	} else {
		if (char === '"') {
			state.inString = true;
		}
		state.jsonString += char;
	}
}

/**
 * Parses a devcontainer.json string, safely stripping comments before parsing.
 * This is a secure alternative to using regex which can be vulnerable to ReDoS.
 * @param {string|object} config - The devcontainer configuration string or object.
 * @param {string} configName - The name of the configuration for error logging.
 * @returns {object} The parsed configuration object.
 * @throws {Error} If the configuration is invalid.
 */
export function parseDevcontainerConfig(config, configName) {
	if (typeof config === 'object') {
		return config;
	}
	if (typeof config !== 'string') {
		throw new TypeError(`Invalid ${configName} devcontainer configuration type`);
	}

	try {
		const state = {
			jsonString: '',
			inString: false,
			inLineComment: false,
			inBlockComment: false,
			i: 0
		};

		for (state.i = 0; state.i < config.length; state.i++) {
			const char = config[state.i];
			const nextChar = state.i + 1 < config.length ? config[state.i + 1] : '';

			if (state.inLineComment) {
				handleLineComment(char, state);
			} else if (state.inBlockComment) {
				handleBlockComment(char, nextChar, state);
			} else if (state.inString) {
				handleInString(char, nextChar, state);
			} else {
				handleDefaultState(char, nextChar, state);
			}
		}

		return JSON.parse(state.jsonString);
	} catch (error) {
		console.error(`Failed to parse ${configName} config:`, error);
		console.error('Config content:', config.slice(0, 200));
		throw new Error(`Invalid ${configName} devcontainer configuration`);
	}
}
