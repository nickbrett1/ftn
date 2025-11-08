/**
 * Utility functions for safe regex validation and testing
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 */

/**
 * Test if a regex pattern is safe from ReDoS attacks
 * @param {string} pattern - The regex pattern to test
 * @param {string} testString - A string that should match the pattern
 * @param {number} timeout - Timeout in milliseconds (default: 1000)
 * @returns {Promise<boolean>|boolean} - True if the pattern is safe
 */
export async function isRegexSafe(pattern, testString, timeout = 1000) {
	try {
		// First, analyze the pattern structure for known dangerous patterns
		if (hasDangerousStructure(pattern)) {
			return false;
		}

		// Use Web Workers for true timeout capability (if available)
		if (typeof Worker !== 'undefined') {
			return await testRegexWithWorker(pattern, testString, timeout);
		}

		// Fallback: Use setTimeout with Promise (less reliable but better than nothing)
		return testRegexWithTimeout(pattern, testString, timeout);
	} catch (error) {
		// Invalid regex patterns are considered unsafe
		return false;
	}
}

/**
 * Analyze regex pattern structure for dangerous patterns
 * @param {string} pattern - The regex pattern to analyze
 * @returns {boolean} - True if pattern has dangerous structure
 */
function hasDangerousStructure(pattern) {
	// Remove regex flags and escape sequences for analysis
	// Pattern breakdown:
	// ^(\/)           - Group 1: matches the leading slash
	// (.*?)           - Group 2: matches the regex pattern content (non-greedy)
	// (\/[gimsuy]*)$  - Group 3: matches the closing slash and optional flags
	// Result: extracts just the pattern content without slashes or flags
	const cleanPattern = pattern.replace(/^(\/)(.*?)(\/[gimsuy]*)$/, '$2');

	// Check for specific dangerous patterns that cause ReDoS
	const dangerousPatterns = [
		// Classic ReDoS patterns
		/\(a\+\)\+/, // (a+)+
		/\(a\|aa\)\*/, // (a|aa)*
		/\(a\|a\+\)\*/, // (a|a+)*

		// Nested quantifiers on word characters
		/\(\\w\+\)\*/, // (\w+)*
		/\(\\w\+\)\+/, // (\w+)+
		/\(\\w\+\)\{1,\}/, // (\w+){1,}

		// Backreferences with quantifiers
		/\\\d+\*/, // \1*, \2*, etc.
		/\\\d+\+/, // \1+, \2+, etc.
		/\\\d+\{1,\}/, // \1{1,}, \2{1,}, etc.

		// Multiple nested quantifiers
		/\(\\w\+\)\+\(\\w\+\)\*/, // (\w+)+(\w+)*
		/\(\\w\+\)\*\(\\w\+\)\+/, // (\w+)*(\w+)+

		// Unbounded repetitions
		/\{\d*,\}/, // {n,} without upper bound
		/\*\+/, // *+ (possessive quantifier)
		/\+\+/ // ++ (possessive quantifier)
	];

	for (const dangerousPattern of dangerousPatterns) {
		if (dangerousPattern.test(cleanPattern)) {
			return true;
		}
	}

	// Check for deeply nested groups (more than 3 levels)
	const groupDepth = countNestedGroups(cleanPattern);
	if (groupDepth > 3) {
		return true;
	}

	return false;
}

/**
 * Count the maximum depth of nested groups in a regex pattern
 * @param {string} pattern - The regex pattern
 * @returns {number} - Maximum nesting depth
 */
function countNestedGroups(pattern) {
	let maxDepth = 0;
	let currentDepth = 0;

	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];

		if (char === '(' && pattern[i - 1] !== '\\') {
			currentDepth++;
			maxDepth = Math.max(maxDepth, currentDepth);
		} else if (char === ')' && pattern[i - 1] !== '\\') {
			currentDepth = Math.max(0, currentDepth - 1);
		}
	}

	return maxDepth;
}

/**
 * Test regex with Web Worker for true timeout capability
 * @param {string} pattern - The regex pattern
 * @param {string} testString - The test string
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if safe
 */
function testRegexWithWorker(pattern, testString, timeout) {
	return new Promise((resolve) => {
		const workerCode = `
			self.onmessage = function(e) {
				const { pattern, testString } = e.data;
				try {
					const regex = new RegExp(pattern);
					const result = regex.test(testString);
					self.postMessage({ safe: true, result });
				} catch (error) {
					self.postMessage({ safe: false, error: error.message });
				}
			};
		`;

		const blob = new Blob([workerCode], { type: 'application/javascript' });
		const worker = new Worker(URL.createObjectURL(blob));

		const timeoutId = setTimeout(() => {
			worker.terminate();
			resolve(false);
		}, timeout);

		worker.onmessage = function (e) {
			clearTimeout(timeoutId);
			worker.terminate();
			resolve(e.data.safe);
		};

		worker.postMessage({ pattern, testString });
	});
}

/**
 * Test regex with setTimeout fallback (less reliable)
 * @param {string} pattern - The regex pattern
 * @param {string} testString - The test string
 * @param {number} timeout - Timeout in milliseconds
 * @returns {boolean} - True if safe
 */
function testRegexWithTimeout(pattern, testString, timeout) {
	try {
		const regex = new RegExp(pattern);
		const startTime = Date.now();

		// Test the pattern
		const result = regex.test(testString);
		const endTime = Date.now();

		// If it takes too long, consider it unsafe
		if (endTime - startTime > timeout) {
			return false;
		}

		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Create a safe regex pattern for matching dates
 * @param {string} format - Date format ('MM/DD/YYYY', 'YYYY-MM-DD', etc.)
 * @returns {RegExp} - Safe regex pattern
 */
export function createSafeDateRegex(format) {
	switch (format) {
		case 'MM/DD/YYYY':
			return /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
		case 'YYYY-MM-DD':
			return /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
		case 'MM-DD-YYYY':
			return /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
		case 'MM/DD/YY':
			return /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
		case 'MM-DD-YY':
			return /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
		default:
			throw new Error(`Unsupported date format: ${format}`);
	}
}

/**
 * Create a safe regex pattern for matching currency amounts
 * @returns {RegExp} - Safe regex pattern for currency amounts
 */
export function createSafeCurrencyRegex() {
	return /(\$[\d,]+\.\d{2})/;
}

/**
 * Create a safe regex pattern for matching card numbers (last 4 digits)
 * @returns {RegExp} - Safe regex pattern for card numbers
 */
export function createSafeCardNumberRegex() {
	return /(?:card|account)\s+(?:number|#)[:\s]*\*{0,4}(\d{4})/i;
}

/**
 * Create a safe regex pattern for matching billing cycles
 * @returns {RegExp} - Safe regex pattern for billing cycles
 */
export function createSafeBillingCycleRegex() {
	return /(?:billing|statement)\s+(?:period|cycle|date)[:\s]*([^.\n]+)/i;
}

/**
 * Escape a string so it can be safely used inside a RegExp
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a safe regex pattern for matching cookies
 * @param {string} cookieName - Name of the cookie to match
 * @returns {RegExp} - Safe regex pattern for cookies
 */
export function createSafeCookieRegex(cookieName) {
	const escaped = escapeRegex(cookieName || '');
	return new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`);
}

/**
 * Validate and sanitize a regex pattern to prevent ReDoS
 * @param {string} pattern - The regex pattern to validate
 * @returns {RegExp|null} - Safe regex object or null if unsafe
 */
export function createSafeRegex(pattern) {
	try {
		// Use the same structural analysis as isRegexSafe
		if (hasDangerousStructure(pattern)) {
			console.warn(`Potentially dangerous regex pattern detected: ${pattern}`);
			return null;
		}

		return new RegExp(pattern);
	} catch (error) {
		console.error(`Invalid regex pattern: ${pattern}`, error);
		return null;
	}
}
