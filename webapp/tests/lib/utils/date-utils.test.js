import { describe, it, expect } from 'vitest';
import {
	formatDate,
	formatShortDate,
	formatMediumDate,
	formatMonthYear,
	formatRelativeTime, formatTime,
	parseISODateParts,
	isToday,
	isYesterday
} from '../../../src/lib/utils/date-utils';

describe('date-utils', () => {
	describe('formatDate', () => {
		it('should format YYYY-MM-DD correctly without time', () => {
			expect(formatDate('2023-10-25')).toBe('October 25, 2023');
		});

		it('should handle falsy input', () => {
			expect(formatDate(null)).toBe('');
		});

		it('should handle invalid date input', () => {
			expect(formatDate('invalid-date')).toBe('');
		});
	});

	describe('formatMediumDate', () => {
		it('should format YYYY-MM-DD correctly', () => {
			expect(formatMediumDate('2023-10-25')).toBe('Oct 25, 2023');
		});

		it('should handle invalid date input', () => {
			expect(formatMediumDate('invalid-date')).toBe('');
		});
	});

	describe('formatRelativeTime', () => {
		it('should handle YYYY-MM-DD input', () => {
			const result = formatRelativeTime('2023-10-25');
			expect(typeof result).toBe('string');
		});

		it('should handle invalid date input', () => {
			expect(formatRelativeTime('invalid-date')).toBe('');
		});
	});

	describe('isToday', () => {
		it('should return false for old date', () => {
			expect(isToday('2023-10-25')).toBe(false);
		});

		it('should handle invalid date input', () => {
			expect(isToday('invalid-date')).toBe(false);
		});
	});

	describe('isYesterday', () => {
		it('should return false for old date', () => {
			expect(isYesterday('2023-10-25')).toBe(false);
		});

		it('should handle invalid date input', () => {
			expect(isYesterday('invalid-date')).toBe(false);
		});
	});
});

	describe('formatTime', () => {
		it('should handle pure date inputs YYYY-MM-DD gracefully', () => {
			expect(formatTime('2023-01-15')).toBe('');
		});
	});
