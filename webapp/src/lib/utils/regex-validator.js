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
		// Use Web Workers for true timeout capability (if available)
		if (typeof Worker !== 'undefined') {
			return await testRegexWithWorker(pattern, testString, timeout);
		}

		// Fallback: Use setTimeout with Promise (less reliable but better than nothing)
		return testRegexWithTimeout(pattern, testString, timeout);
	} catch {
		// Invalid regex patterns are considered unsafe
		return false;
	}
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
		regex.test(testString);
		const endTime = Date.now();

		// If it takes too long, consider it unsafe
		if (endTime - startTime > timeout) {
			return false;
		}

		return true;
	} catch {
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

/**
 * Perform a structural analysis of a regex pattern to detect constructs
 * that are commonly associated with ReDoS vulnerabilities.
 *
 * @param {string} pattern - The regex pattern to analyze.
 * @returns {boolean} - True if a potentially dangerous structure is detected.
 */
function hasDangerousStructure(pattern) {
	// List of known dangerous patterns
	const dangerousPatterns = [
		'(a+)+',
		'(\\w)*',
		'(a|aa)*',
		'(\\w+)+',
		'(\\w+)*\\1'
		// Add more known dangerous patterns here if needed
	];

	// Check if the pattern matches any of the known dangerous patterns
	if (dangerousPatterns.includes(pattern)) {
		return true;
	}

	// You can still keep your more general checks as a fallback
	// 1. Nested Quantifiers: e.g., (a+)+, (a*)*
	if (/(\([^)]*[\+\*]\)[+*])/.test(pattern)) {
		return true;
	}

	// 2. Alternation with Overlapping Patterns: e.g., (a|aa)*
	const alternationGroups = pattern.match(/\(([^)]*\|[^)]*)\)\*/g);
	if (alternationGroups) {
		for (const group of alternationGroups) {
			const alternatives = group.slice(1, -2).split('|');
			for (let i = 0; i < alternatives.length; i++) {
				for (let j = i + 1; j < alternatives.length; j++) {
					if (
						alternatives[j].startsWith(alternatives[i]) ||
						alternatives[i].startsWith(alternatives[j])
					) {
						return true;
					}
				}
			}
		}
	}

	// 3. Backreferences in Repeated Groups: e.g., (\w+)*\1
	if (/(\\d+)\*.*\\\1/.test(pattern)) {
		return true;
	}

	return false;
}
