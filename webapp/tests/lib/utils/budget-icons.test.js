import { describe, it, expect } from 'vitest';
import {
	getAvailableIcons,
	getIconDescription,
	getDefaultIcon,
	getAllocationIcon,
	getNextAllocation,
	getAvailableIconsForBudget,
	isIconUsedByOtherBudget,
	getBudgetNameUsingIcon,
	BUDGET_ICONS
} from '../../../src/lib/utils/budget-icons.js';

describe('Budget Icons Utility', () => {
	describe('getAvailableIcons', () => {
		it('should return an array of emoji icons', () => {
			const icons = getAvailableIcons();
			expect(Array.isArray(icons)).toBe(true);
			expect(icons.length).toBeGreaterThan(0);
			expect(icons).toContain('🛒');
		});
	});

	describe('getIconDescription', () => {
		it('should return description for known icon', () => {
			expect(getIconDescription('🛒')).toBe('Groceries');
			expect(getIconDescription('🚗')).toBe('Transportation');
		});

		it('should return "Unknown" for unknown icon', () => {
			expect(getIconDescription('👽')).toBe('Unknown');
		});
	});

	describe('getDefaultIcon', () => {
		it('should return mapped icon for matching keywords', () => {
			// Matches 'grocery'
			expect(getDefaultIcon('My Grocery Store')).toBe('🛒');
			// Matches 'gas'
			expect(getDefaultIcon('Gas Station')).toBe('🚗');
			// Matches 'streaming' - which maps to 'movie' keyword icon 🎬 in current implementation
			// Actually 'streaming' keyword is mapped to 📺 in ICON_KEYWORD_MAP?
			// Let's check budget-icons.js content again.
			// { keywords: ['entertainment', 'movie', 'streaming'], icon: '🎬' },
			// { keywords: ['streaming', 'netflix', 'hulu'], icon: '📺' },
			// Ah, 'streaming' appears in both? The first one wins.
			expect(getDefaultIcon('Netflix Streaming')).toBe('🎬');
		});

		it('should be case insensitive', () => {
			expect(getDefaultIcon('grocery')).toBe('🛒');
			expect(getDefaultIcon('GROCERY')).toBe('🛒');
		});

		it('should return default fallback icon for no match', () => {
			expect(getDefaultIcon('Something Random')).toBe('📦');
		});
	});

	describe('getAllocationIcon', () => {
		it('should return "❌" for empty allocation', () => {
			expect(getAllocationIcon('')).toBe('❌');
			expect(getAllocationIcon(null)).toBe('❌');
		});

		it('should return icon from budget if found', () => {
			const budgets = [{ name: 'Food', icon: '🍔' }];
			expect(getAllocationIcon('Food', budgets)).toBe('🍔');
		});

		it('should fallback to keyword match if budget not found', () => {
			const budgets = [];
			// 'Grocery' contains 'grocery'
			expect(getAllocationIcon('Grocery', budgets)).toBe('🛒');
		});
	});

	describe('getNextAllocation', () => {
		it('should cycle through budget names including null', () => {
			const budgets = [{ name: 'A' }, { name: 'B' }];

			// Start with null (Unallocated) -> A
			expect(getNextAllocation(null, budgets)).toBe('A');

			// A -> B
			expect(getNextAllocation('A', budgets)).toBe('B');

			// B -> null
			expect(getNextAllocation('B', budgets)).toBe(null);
		});

		it('should handle empty budgets', () => {
			expect(getNextAllocation(null, [])).toBe(null);
		});
	});

	describe('getAvailableIconsForBudget', () => {
		const budgets = [
			{ id: 1, icon: '🛒', name: 'Groceries' },
			{ id: 2, icon: '🚗', name: 'Transport' }
		];

		it('should exclude icons used by other budgets', () => {
			const available = getAvailableIconsForBudget(budgets, null); // New budget
			expect(available).not.toContain('🛒');
			expect(available).not.toContain('🚗');
			expect(available).toContain('🏠');
		});

		it('should include icon used by current budget when editing', () => {
			const available = getAvailableIconsForBudget(budgets, 1); // Editing budget 1
			expect(available).toContain('🛒'); // Should be available for itself
			expect(available).not.toContain('🚗');
		});
	});

	describe('isIconUsedByOtherBudget', () => {
		const budgets = [{ id: 1, icon: '🛒', name: 'Groceries' }];

		it('should return true if icon is used by another budget', () => {
			expect(isIconUsedByOtherBudget('🛒', budgets, 2)).toBe(true);
		});

		it('should return false if icon is not used', () => {
			expect(isIconUsedByOtherBudget('🏠', budgets, 2)).toBe(false);
		});

		it('should return false if icon is used by current budget', () => {
			expect(isIconUsedByOtherBudget('🛒', budgets, 1)).toBe(false);
		});
	});

	describe('getBudgetNameUsingIcon', () => {
		const budgets = [{ id: 1, icon: '🛒', name: 'Groceries' }];

		it('should return budget name using the icon', () => {
			expect(getBudgetNameUsingIcon('🛒', budgets, 2)).toBe('Groceries');
		});

		it('should return null if icon is not used', () => {
			expect(getBudgetNameUsingIcon('🏠', budgets, 2)).toBe(null);
		});

		it('should return null if icon is used by current budget', () => {
			expect(getBudgetNameUsingIcon('🛒', budgets, 1)).toBe(null);
		});
	});

	describe('BUDGET_ICONS constant', () => {
		it('should have key-value pairs', () => {
			expect(BUDGET_ICONS['🛒']).toBe('Groceries');
		});
	});
});
