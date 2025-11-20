/**
 * Available budget icons
 * Each icon should be unique to avoid confusion
 */
export const BUDGET_ICONS = {
	'🛒': 'Groceries',
	'🍽️': 'Dining',
	'🚗': 'Transportation',
	'🎬': 'Entertainment',
	'🛍️': 'Shopping',
	'✈️': 'Travel',
	'💡': 'Utilities',
	'🏥': 'Healthcare',
	'🏠': 'Housing',
	'🎓': 'Education',
	'💻': 'Technology',
	'🎮': 'Gaming',
	'🏃': 'Fitness',
	'🐕': 'Pets',
	'👕': 'Clothing',
	'📚': 'Books',
	'🎨': 'Hobbies',
	'💄': 'Beauty',
	'🍷': 'Alcohol',
	'🎁': 'Gifts',
	'💊': 'Medicine',
	'🚌': 'Public Transit',
	'⛽': 'Gas',
	'🏦': 'Banking',
	'📱': 'Mobile',
	'📺': 'Streaming',
	'🎵': 'Music',
	'📰': 'News',
	'🏖️': 'Vacation',
	'🎪': 'Events',
	'💍': 'Jewelry',
	'🔧': 'Home Improvement',
	'🌱': 'Garden',
	'🎯': 'Sports',
	'📷': 'Photography',
	'🎭': 'Entertainment',
	'💎': 'Luxury',
	'🔋': 'Electronics',
	'😍': 'Love',
	'😎': 'Cool',
	'🤔': 'Thinking',
	'🤠': 'Cowboy',
	'🤡': 'Clown',
	'📦': 'Other'
};

/**
 * Get all available icons as an array
 */
export function getAvailableIcons() {
	return Object.keys(BUDGET_ICONS);
}

/**
 * Get icon description by emoji
 */
export function getIconDescription(emoji) {
	return BUDGET_ICONS[emoji] || 'Unknown';
}


const ICON_KEYWORD_MAP = [
	{ keywords: ['grocery', 'food', 'supermarket'], icon: '🛒' },
	{ keywords: ['dining', 'restaurant', 'food'], icon: '🍽️' },
	{ keywords: ['transport', 'car', 'gas'], icon: '🚗' },
	{ keywords: ['entertainment', 'movie', 'streaming'], icon: '🎬' },
	{ keywords: ['shopping', 'retail'], icon: '🛍️' },
	{ keywords: ['travel', 'flight', 'hotel'], icon: '✈️' },
	{ keywords: ['utility', 'electric', 'water'], icon: '💡' },
	{ keywords: ['health', 'medical', 'doctor'], icon: '🏥' },
	{ keywords: ['housing', 'rent', 'mortgage'], icon: '🏠' },
	{ keywords: ['education', 'school', 'college'], icon: '🎓' },
	{ keywords: ['tech', 'computer', 'software'], icon: '💻' },
	{ keywords: ['game', 'gaming'], icon: '🎮' },
	{ keywords: ['fitness', 'gym', 'workout'], icon: '🏃' },
	{ keywords: ['pet', 'dog', 'cat'], icon: '🐕' },
	{ keywords: ['clothing', 'apparel'], icon: '👕' },
	{ keywords: ['book', 'reading'], icon: '📚' },
	{ keywords: ['hobby', 'craft'], icon: '🎨' },
	{ keywords: ['beauty', 'cosmetic'], icon: '💄' },
	{ keywords: ['alcohol', 'wine', 'beer'], icon: '🍷' },
	{ keywords: ['gift', 'present'], icon: '🎁' },
	{ keywords: ['medicine', 'pharmacy'], icon: '💊' },
	{ keywords: ['transit', 'bus', 'train'], icon: '🚌' },
	{ keywords: ['gas', 'fuel'], icon: '⛽' },
	{ keywords: ['bank', 'financial'], icon: '🏦' },
	{ keywords: ['mobile', 'phone'], icon: '📱' },
	{ keywords: ['streaming', 'netflix', 'hulu'], icon: '📺' },
	{ keywords: ['music', 'spotify'], icon: '🎵' },
	{ keywords: ['news', 'subscription'], icon: '📰' },
	{ keywords: ['vacation', 'holiday'], icon: '🏖️' },
	{ keywords: ['event', 'concert'], icon: '🎪' },
	{ keywords: ['jewelry', 'accessory'], icon: '💍' },
	{ keywords: ['home', 'improvement'], icon: '🔧' },
	{ keywords: ['garden', 'plant'], icon: '🌱' },
	{ keywords: ['sport', 'athletic'], icon: '🎯' },
	{ keywords: ['photo', 'camera'], icon: '📷' },
	{ keywords: ['luxury', 'premium'], icon: '💎' },
			{ keywords: ['electronic', 'device'], icon: '🔋' }];

/**
 * Get default icon for a budget name
 */
export function getDefaultIcon(budgetName) {
	const name = budgetName.toLowerCase();

	for (const { keywords, icon } of ICON_KEYWORD_MAP) {
		if (keywords.some((keyword) => name.includes(keyword))) {
			return icon;
		}
	}

	return '📦'; // Default fallback
}

/**
 * Get allocation icon for display
 */
export function getAllocationIcon(allocation, budgets = []) {
	if (!allocation || allocation === '') return '❌';

	// Find the budget with this name and get its icon
	const budget = budgets.find((b) => b.name === allocation);
	if (budget?.icon) return budget.icon;

	// Fallback to default icon based on budget name
	return getDefaultIcon(allocation);
}

/**
 * Get next allocation option for cycling
 */
export function getNextAllocation(currentAllocation, budgets = []) {
	const options = [null, ...budgets.map((b) => b.name)];
	const currentIndex = options.indexOf(currentAllocation);
	const nextIndex = (currentIndex + 1) % options.length;
	return options[nextIndex];
}

/**
 * Get available icons that are not already used by other budgets
 */
export function getAvailableIconsForBudget(budgets = [], currentBudgetId = null) {
	const usedIcons = new Set(
		budgets
			.filter((budget) => budget.id !== currentBudgetId) // Exclude current budget when editing
			.map((budget) => budget.icon)
			.filter(Boolean)
	); // Filter out null/undefined icons

	return getAvailableIcons().filter((icon) => !usedIcons.has(icon));
}

/**
 * Check if an icon is already used by another budget
 */
export function isIconUsedByOtherBudget(icon, budgets = [], currentBudgetId = null) {
	return budgets
		.filter((budget) => budget.id !== currentBudgetId) // Exclude current budget when editing
		.some((budget) => budget.icon === icon);
}

/**
 * Get the budget name that uses a specific icon
 */
export function getBudgetNameUsingIcon(icon, budgets = [], currentBudgetId = null) {
	const budget = budgets
		.filter((budget) => budget.id !== currentBudgetId) // Exclude current budget when editing
		.find((budget) => budget.icon === icon);
	return budget?.name || null;
}
