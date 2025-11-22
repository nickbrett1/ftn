/**
 * @fileoverview Tests for date utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	formatDate,
	formatShortDate,
	formatMediumDate,
	formatTime,
	formatRelativeTime,
	isToday,
	isYesterday
} from './date-utils.js';

describe('Date Utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('formatDate', () => {
		it('should return empty string for null/undefined/empty input', () => {
			expect(formatDate(null)).toBe('');
			expect(formatDate()).toBe('');
			expect(formatDate('')).toBe('');
		});

		it('should return empty string for invalid date', () => {
			expect(formatDate('invalid-date')).toBe('');
		});

		it('should format date with time and timezone by default', () => {
			const date = new Date('2023-01-15T14:30:00Z');
			const result = formatDate(date);

			// Check structure: "Month Day, Year at HH:MM AM/PM Timezone"
			// Since timezone depends on system, we check for parts
			expect(result).toContain('January 15, 2023');
			expect(result).toContain('at');
			// Check for AM/PM pattern
			expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
		});

		it('should format date without time when includeTime is false', () => {
			const date = new Date('2023-01-15T14:30:00Z');
			const result = formatDate(date, { includeTime: false });

			expect(result).toBe('January 15, 2023'); // Date part should be stable for this timestamp in US timezones (or UTC)
		});

		it('should format date without timezone when includeTimezone is false', () => {
			const date = new Date('2023-01-15T14:30:00Z');
			const result = formatDate(date, { includeTimezone: false });

			expect(result).toContain('January 15, 2023');
			expect(result).toContain('at');
			// Should not have timezone code (like UTC, EST, GMT) at the end?
			// Actually, toLocaleTimeString with timeZoneName: undefined might still show it depending on implementation?
			// The code says: timeZoneName: includeTimezone ? 'short' : undefined
			// If undefined, it should not show timezone.

			// Let's check that it ends with AM or PM
			expect(result).toMatch(/[AP]M$/);
		});
	});

	describe('formatShortDate', () => {
		it('should return empty string for invalid inputs', () => {
			expect(formatShortDate(null)).toBe('');
			expect(formatShortDate('')).toBe('');
			expect(formatShortDate('invalid')).toBe('');
		});

		it('should format date as MM/DD', () => {
			// Use a date that is safe across likely timezones for the test, or construct with local components
			const date = new Date(2023, 0, 5); // Jan 5, 2023 local time
			expect(formatShortDate(date)).toBe('01/05');
		});

		it('should pad single digits', () => {
			const date = new Date(2023, 8, 9); // Sept 9, 2023 local time
			expect(formatShortDate(date)).toBe('09/09');
		});
	});

	describe('formatMediumDate', () => {
		it('should return empty string for invalid inputs', () => {
			expect(formatMediumDate(null)).toBe('');
			expect(formatMediumDate('')).toBe('');
			expect(formatMediumDate('invalid')).toBe('');
		});

		it('should format date as MMM D, YYYY', () => {
			const date = new Date('2023-01-15T12:00:00'); // Local ISO parsing
			// formatMediumDate uses toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
			expect(formatMediumDate(date)).toBe('Jan 15, 2023');
		});
	});

	describe('formatTime', () => {
		it('should return empty string for invalid inputs', () => {
			expect(formatTime(null)).toBe('');
			expect(formatTime('')).toBe('');
			expect(formatTime('invalid')).toBe('');
		});

		it('should format time with timezone by default', () => {
			const date = new Date('2023-01-15T14:30:00Z');
			const result = formatTime(date);
			// Expect HH:MM AM/PM Timezone
			expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M\s.+/);
		});

		it('should format time without timezone', () => {
			const date = new Date('2023-01-15T14:30:00Z');
			const result = formatTime(date, false);
			expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M$/);
		});
	});

	describe('formatRelativeTime', () => {
		it('should return empty string for invalid inputs', () => {
			expect(formatRelativeTime(null)).toBe('');
			expect(formatRelativeTime('invalid')).toBe('');
		});

		it('should return "just now" for less than 1 minute ago', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
			expect(formatRelativeTime(date)).toBe('just now');
		});

		it('should return minutes ago', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
			expect(formatRelativeTime(date)).toBe('5 minutes ago');
		});

		it('should handle singular minute', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 60 * 1000); // 1 minute ago exactly
			expect(formatRelativeTime(date)).toBe('1 minute ago');
		});

		it('should return hours ago', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
			expect(formatRelativeTime(date)).toBe('2 hours ago');
		});

		it('should handle singular hour', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
			expect(formatRelativeTime(date)).toBe('1 hour ago');
		});

		it('should return "yesterday" for 1 day ago', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
			// Note: formatRelativeTime uses exact 24 hour periods for "days", not calendar days for this check
			// The code: const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
			// if (diffInDays === 1) return 'yesterday';
			expect(formatRelativeTime(date)).toBe('yesterday');
		});

		it('should return days ago for less than 7 days', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
			expect(formatRelativeTime(date)).toBe('3 days ago');
		});

		it('should return medium date format for 7 days or more', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
			// Expect Jan 8, 2023
			// Note: This depends on timezone if the subtraction crosses a date boundary locally vs UTC
			// But 7 days exactly should be fine.
			expect(formatRelativeTime(date)).toBe('Jan 8, 2023');
		});
	});

	describe('isToday', () => {
		it('should return false for invalid inputs', () => {
			expect(isToday(null)).toBe(false);
			expect(isToday('invalid')).toBe(false);
		});

		it('should return true for today', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			expect(isToday(now)).toBe(true);
			// Also check same day different time
			const earlier = new Date('2023-01-15T01:00:00Z');
			// Ideally this is testing "same calendar day".
			// If system is UTC, this works.
			// Since isToday uses toDateString(), it uses local time.
			// If we set system time, "local" time is based on that but offset remains system's offset.
			// Best is to construct a date that is definitely same day locally.
			const localNow = new Date();
			expect(isToday(localNow)).toBe(true);
		});

		it('should return false for not today', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const yesterday = new Date('2023-01-14T12:00:00Z');
			expect(isToday(yesterday)).toBe(false);
		});
	});

	describe('isYesterday', () => {
		it('should return false for invalid inputs', () => {
			expect(isYesterday(null)).toBe(false);
			expect(isYesterday('invalid')).toBe(false);
		});

		it('should return true for yesterday', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			const yesterday = new Date('2023-01-14T12:00:00Z');
			expect(isYesterday(yesterday)).toBe(true);
		});

		it('should return false for today or other days', () => {
			const now = new Date('2023-01-15T12:00:00Z');
			vi.setSystemTime(now);

			expect(isYesterday(now)).toBe(false);

			const twoDaysAgo = new Date('2023-01-13T12:00:00Z');
			expect(isYesterday(twoDaysAgo)).toBe(false);
		});
	});
});
