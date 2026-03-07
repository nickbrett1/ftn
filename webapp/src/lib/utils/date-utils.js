/**
 * Shared date formatting utilities for consistent date display across the application
 */

/**
 * Helper to parse YYYY-MM-DD string into local date components without timezone shift
 */
function parseISODateParts(dateInput) {
	if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
		const [year, month, day] = dateInput.split('-').map(Number);
		return { year, month: month - 1, day }; // month is 0-indexed for Date constructor
	}
	return null;
}

/**
 * Format a date string to a user-friendly, fully spelled out format with local timezone
 * @param {string|Date} dateInput - Date string or Date object
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Whether to include time (default: true)
 * @param {boolean} options.includeTimezone - Whether to include timezone (default: true)
 * @returns {string} Formatted date string
 */
export function formatDate(dateInput, options = {}) {
	const { includeTime = true, includeTimezone = true } = options;

	if (!dateInput) return '';

	// Special handling for YYYY-MM-DD to avoid UTC shift
	const parts = parseISODateParts(dateInput);
	const date = parts
		? new Date(parts.year, parts.month, parts.day)
		: new Date(dateInput);
		
	if (Number.isNaN(date.getTime())) return '';

	if (includeTime && !parts) {
		// Format: "August 17, 2025 at 02:32 PM EDT"
		const dateOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};

		const timeOptions = {
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: includeTimezone ? 'short' : undefined
		};

		const formattedDate = date.toLocaleDateString('en-US', dateOptions);
		const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

		return `${formattedDate} at ${formattedTime}`;
	} else {
		// Format: "August 17, 2025"
		const dateOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};
		return date.toLocaleDateString('en-US', dateOptions);
	}
}

/**
 * Format a date string to a short MM/DD format
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string in MM/DD format
 */
export function formatShortDate(dateInput) {
	if (!dateInput) return '';

	// Special handling for YYYY-MM-DD to avoid UTC shift
	const parts = parseISODateParts(dateInput);
	if (parts) {
		const month = (parts.month + 1).toString().padStart(2, '0');
		const day = parts.day.toString().padStart(2, '0');
		return `${month}/${day}`;
	}

	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) return '';

	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');

	return `${month}/${day}`;
}

/**
 * Format a date string to a medium format (e.g., "Jan 15, 2024")
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string
 */
export function formatMediumDate(dateInput) {
	if (!dateInput) return '';

	// Special handling for YYYY-MM-DD to avoid UTC shift
	const parts = parseISODateParts(dateInput);
	const date = parts
		? new Date(parts.year, parts.month, parts.day)
		: new Date(dateInput);

	if (Number.isNaN(date.getTime())) return '';

	const options = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	};

	return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string to show only the time in local timezone
 * @param {string|Date} dateInput - Date string or Date object
 * @param {boolean} includeTimezone - Whether to include timezone (default: true)
 * @returns {string} Formatted time string
 */
export function formatTime(dateInput, includeTimezone = true) {
	if (!dateInput) return '';

	// If it's just a date string (YYYY-MM-DD), time is not applicable
	if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
		return '';
	}

	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) return '';

	const options = {
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: includeTimezone ? 'short' : undefined
	};

	return date.toLocaleTimeString('en-US', options);
}

/**
 * Format a date string to show relative time (e.g., "2 hours ago", "yesterday")
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateInput) {
	if (!dateInput) return '';

	const parts = parseISODateParts(dateInput);
	const date = parts
		? new Date(parts.year, parts.month, parts.day)
		: new Date(dateInput);

	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const diffInMs = now - date;
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
	const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (diffInMinutes < 1) return 'just now';
	if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
	if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
	if (diffInDays === 1) return 'yesterday';
	if (diffInDays < 7) return `${diffInDays} days ago`;

	// For older dates, use the medium format
	return formatMediumDate(dateInput);
}

/**
 * Check if a date is today
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {boolean} True if the date is today
 */
export function isToday(dateInput) {
	if (!dateInput) return false;

	const parts = parseISODateParts(dateInput);
	const date = parts
		? new Date(parts.year, parts.month, parts.day)
		: new Date(dateInput);

	if (Number.isNaN(date.getTime())) return false;

	const today = new Date();
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
}

/**
 * Check if a date is yesterday
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {boolean} True if the date is yesterday
 */
export function isYesterday(dateInput) {
	if (!dateInput) return false;

	const parts = parseISODateParts(dateInput);
	const date = parts
		? new Date(parts.year, parts.month, parts.day)
		: new Date(dateInput);

	if (Number.isNaN(date.getTime())) return false;

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	return (
		date.getFullYear() === yesterday.getFullYear() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getDate() === yesterday.getDate()
	);
}
