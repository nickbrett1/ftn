import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUnassignedMerchants } from '../../../src/lib/server/ccbilling-db.js';

describe('Duplicate Merchant Variations Test', () => {
	let mockDatabase;
	let mockEvent;

	beforeEach(() => {
		mockDatabase = {
			prepare: vi.fn().mockReturnValue({
				all: vi.fn(),
				bind: vi.fn().mockReturnThis()
			})
		};

		mockEvent = {
			platform: { env: { CCBILLING_DB: mockDatabase } }
		};
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	it('should handle duplicate merchant variations correctly', async () => {
		// Mock data that simulates the duplicate merchant scenario
		// "ABW ENTERPRISES" is assigned, but "ABW ENTERPRISES INC" is not
		// Both normalize to the same value but have different assignment statuses

		// Mock assigned merchants query
		mockDatabase.prepare.mockReturnValueOnce({
			all: vi.fn().mockResolvedValue({
				results: [
					{ merchant_normalized: 'ABW ENTERPRISES' },
					{ merchant_normalized: 'AMAZON' },
					{ merchant_normalized: 'TARGET' }
				]
			})
		});

		// Mock all payment merchants query
		mockDatabase.prepare.mockReturnValueOnce({
			all: vi.fn().mockResolvedValue({
				results: [
					{ merchant_normalized: 'ABW ENTERPRISES' }, // This one is assigned
					{ merchant_normalized: 'ABW ENTERPRISES INC' }, // This one is NOT assigned but normalizes to same value
					{ merchant_normalized: 'AMAZON' },
					{ merchant_normalized: 'TARGET' },
					{ merchant_normalized: 'WALMART' } // This one is not assigned
				]
			})
		});

		const result = await getUnassignedMerchants(mockEvent);

		// Should only return merchants that are truly unassigned
		// "ABW ENTERPRISES" and "ABW ENTERPRISES INC" should both be filtered out
		// because "ABW ENTERPRISES" is assigned (they normalize to the same value)
		expect(result).toEqual(['WALMART']);

		// Verify the correct queries were made
		expect(mockDatabase.prepare).toHaveBeenCalledTimes(2);
	});

	it('should demonstrate the bug: duplicate variations cause assigned merchants to appear as unassigned', async () => {
		// This test demonstrates the bug scenario:
		// 1. "ABW ENTERPRISES" is assigned to a budget
		// 2. "ABW ENTERPRISES INC" exists in payments but is not assigned
		// 3. Both normalize to "ABW ENTERPRISES"
		// 4. The old SQL approach would show "ABW ENTERPRISES INC" as unassigned
		// 5. But the user sees this as "ABW ENTERPRISES" being available again

		// Mock assigned merchants (only "ABW ENTERPRISES" is assigned)
		mockDatabase.prepare.mockReturnValueOnce({
			all: vi.fn().mockResolvedValue({
				results: [{ merchant_normalized: 'ABW ENTERPRISES' }]
			})
		});

		// Mock payment merchants (both variations exist)
		mockDatabase.prepare.mockReturnValueOnce({
			all: vi.fn().mockResolvedValue({
				results: [
					{ merchant_normalized: 'ABW ENTERPRISES' }, // Assigned
					{ merchant_normalized: 'ABW ENTERPRISES INC' } // Not assigned but same normalized value
				]
			})
		});

		const result = await getUnassignedMerchants(mockEvent);

		// With the JavaScript filtering approach, both should be filtered out
		// because they normalize to the same value and one is assigned
		expect(result).toEqual([]);
	});
});
