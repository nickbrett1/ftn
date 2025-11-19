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

const iconMappings = {
	'🛒': ['grocery', 'food', 'supermarket'],
	'🍽️': ['dining', 'restaurant'],
	'🚗': ['transport', 'car'],
	'🎬': ['entertainment', 'movie'],
	'🛍️': ['shopping', 'retail'],
	'✈️': ['travel', 'flight', 'hotel'],
	'💡': ['utility', 'electric', 'water'],
	'🏥': ['health', 'medical', 'doctor'],
	'🏠': ['housing', 'rent', 'mortgage'],
	'🎓': ['education', 'school', 'college'],
	'💻': ['tech', 'computer', 'software'],
	'🎮': ['game', 'gaming'],
	'🏃': ['fitness', 'gym', 'workout'],
	'🐕': ['pet', 'dog', 'cat'],
	'👕': ['clothing', 'apparel'],
	'📚': ['book', 'reading'],
	'🎨': ['hobby', 'craft'],
	'💄': ['beauty', 'cosmetic'],
	'🍷': ['alcohol', 'wine', 'beer'],
	'🎁': ['gift', 'present'],
	'💊': ['medicine', 'pharmacy'],
	'🚌': ['transit', 'bus', 'train'],
	'⛽': ['gas', 'fuel'],
	'🏦': ['bank', 'financial'],
	'📱': ['mobile', 'phone'],
	'📺': ['streaming', 'netflix', 'hulu'],
	'🎵': ['music', 'spotify'],
	'📰': ['news', 'subscription'],
	'🏖️': ['vacation', 'holiday'],
	'🎪': ['event', 'concert'],
	'💍': ['jewelry', 'accessory'],
	'🔧': ['home', 'improvement'],
	'🌱': ['garden', 'plant'],
	'🎯': ['sport', 'athletic'],
	'📷': ['photo', 'camera'],
	'💎': ['luxury', 'premium'],
	'🔋': ['electronic', 'device']
};

/**
 * Get default icon for a budget name
 */
export function getDefaultIcon(budgetName) {
	const name = budgetName.toLowerCase();
	for (const [icon, keywords] of Object.entries(iconMappings)) {
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
