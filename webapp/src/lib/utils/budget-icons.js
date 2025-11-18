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

/**
 * Get default icon for a budget name
 */
export function getDefaultIcon(budgetName) {
	const name = budgetName.toLowerCase();

	if (name.includes('grocery') || name.includes('food') || name.includes('supermarket'))
		return '🛒';
	if (name.includes('dining') || name.includes('restaurant') || name.includes('food')) return '🍽️';
	if (name.includes('transport') || name.includes('car') || name.includes('gas')) return '🚗';
	if (name.includes('entertainment') || name.includes('movie') || name.includes('streaming'))
		return '🎬';
	if (name.includes('shopping') || name.includes('retail')) return '🛍️';
	if (name.includes('travel') || name.includes('flight') || name.includes('hotel')) return '✈️';
	if (name.includes('utility') || name.includes('electric') || name.includes('water')) return '💡';
	if (name.includes('health') || name.includes('medical') || name.includes('doctor')) return '🏥';
	if (name.includes('housing') || name.includes('rent') || name.includes('mortgage')) return '🏠';
	if (name.includes('education') || name.includes('school') || name.includes('college'))
		return '🎓';
	if (name.includes('tech') || name.includes('computer') || name.includes('software')) return '💻';
	if (name.includes('game') || name.includes('gaming')) return '🎮';
	if (name.includes('fitness') || name.includes('gym') || name.includes('workout')) return '🏃';
	if (name.includes('pet') || name.includes('dog') || name.includes('cat')) return '🐕';
	if (name.includes('clothing') || name.includes('apparel')) return '👕';
	if (name.includes('book') || name.includes('reading')) return '📚';
	if (name.includes('hobby') || name.includes('craft')) return '🎨';
	if (name.includes('beauty') || name.includes('cosmetic')) return '💄';
	if (name.includes('alcohol') || name.includes('wine') || name.includes('beer')) return '🍷';
	if (name.includes('gift') || name.includes('present')) return '🎁';
	if (name.includes('medicine') || name.includes('pharmacy')) return '💊';
	if (name.includes('transit') || name.includes('bus') || name.includes('train')) return '🚌';
	if (name.includes('gas') || name.includes('fuel')) return '⛽';
	if (name.includes('bank') || name.includes('financial')) return '🏦';
	if (name.includes('mobile') || name.includes('phone')) return '📱';
	if (name.includes('streaming') || name.includes('netflix') || name.includes('hulu')) return '📺';
	if (name.includes('music') || name.includes('spotify')) return '🎵';
	if (name.includes('news') || name.includes('subscription')) return '📰';
	if (name.includes('vacation') || name.includes('holiday')) return '🏖️';
	if (name.includes('event') || name.includes('concert')) return '🎪';
	if (name.includes('jewelry') || name.includes('accessory')) return '💍';
	if (name.includes('home') || name.includes('improvement')) return '🔧';
	if (name.includes('garden') || name.includes('plant')) return '🌱';
	if (name.includes('sport') || name.includes('athletic')) return '🎯';
	if (name.includes('photo') || name.includes('camera')) return '📷';
	if (name.includes('luxury') || name.includes('premium')) return '💎';
	if (name.includes('electronic') || name.includes('device')) return '🔋';

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
