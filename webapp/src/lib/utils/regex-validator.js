/**
 * Utility functions for safe regex validation and testing
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 */

/**
 * Test if a regex pattern is safe from ReDoS attacks
 * @param {string} pattern - The regex pattern to test
 * @param {string} testString - A string that should match the pattern
 * @param {number} timeout - Timeout in milliseconds (default: 1000)
 * @returns {boolean} - True if the pattern is safe
 */
export function isRegexSafe(pattern, testString, timeout = 1000) {
	try {
		const regex = new RegExp(pattern);
		const startTime = Date.now();
		
		// Test the pattern with a timeout
		const result = regex.test(testString);
		const endTime = Date.now();
		
		// If it takes too long, consider it unsafe
		if (endTime - startTime > timeout) {
			return false;
		}
		
		// Also check for known dangerous patterns
		const dangerousPatterns = [
			/(\w+)*/,           // Nested quantifiers
			/(\w+)+/,           // Nested quantifiers
			/(\w+){1,}/,        // Nested quantifiers
			/(\w+)*\1/,         // Backreferences with quantifiers
			/(\w+)+(\w+)*/,     // Multiple nested quantifiers
			/(a+)+/,            // Classic ReDoS pattern
			/(a|aa)*/,          // Another classic ReDoS pattern
		];
		
		for (const dangerousPattern of dangerousPatterns) {
			if (pattern.includes(dangerousPattern.source)) {
				return false;
			}
		}
		
		return true;
	} catch (error) {
		// Invalid regex patterns are considered unsafe
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
 * Create a safe regex pattern for matching cookies
 * @param {string} cookieName - Name of the cookie to match
 * @returns {RegExp} - Safe regex pattern for cookies
 */
export function createSafeCookieRegex(cookieName) {
	return new RegExp(`${cookieName}=([^;]+)`);
}

/**
 * Validate and sanitize a regex pattern to prevent ReDoS
 * @param {string} pattern - The regex pattern to validate
 * @returns {RegExp|null} - Safe regex object or null if unsafe
 */
export function createSafeRegex(pattern) {
	try {
		// Check for common ReDoS patterns
		const dangerousPatterns = [
			/(\w+)*/,           // Nested quantifiers
			/(\w+)+/,           // Nested quantifiers
			/(\w+){1,}/,        // Nested quantifiers
			/(\w+)*\1/,         // Backreferences with quantifiers
			/(\w+)+(\w+)*/,     // Multiple nested quantifiers
			/(a+)+/,            // Classic ReDoS pattern
			/(a|aa)*/,          // Another classic ReDoS pattern
		];
		
		for (const dangerousPattern of dangerousPatterns) {
			if (pattern.includes(dangerousPattern.source)) {
				console.warn(`Potentially dangerous regex pattern detected: ${pattern}`);
				return null;
			}
		}
		
		return new RegExp(pattern);
	} catch (error) {
		console.error(`Invalid regex pattern: ${pattern}`, error);
		return null;
	}
}