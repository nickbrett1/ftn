/**
 * Mode Switching Logic
 *
 * Handles switching between configuration and preview modes
 * in the genproj tool with state persistence and validation.
 *
 * @fileoverview Mode switching utilities for genproj tool
 */

import { writable, derived, get } from 'svelte/store';
import { capabilityStore } from '$lib/client/capability-store.js';
import { projectConfigStore } from '$lib/client/project-config-store.js';

// Mode types
export const MODES = {
	CAPABILITIES: 'capabilities',
	CONFIGURATION: 'configuration',
	PREVIEW: 'preview',
	GENERATION: 'generation'
};

// Mode store
const modeStore = writable(MODES.CAPABILITIES);

// Derived stores
export const currentMode = derived(modeStore, ($mode) => $mode);

export const canSwitchToMode = derived(
	[modeStore, capabilityStore, projectConfigStore],
	([mode, capabilities, config]) => {
		return validateModeSwitch(mode, capabilities, config);
	}
);

/**
 * Validates if switching to a mode is allowed
 * @param {string} currentMode - Current mode (unused, but kept for API consistency)
 * @param {Object} capabilities - Capability store state
 * @param {Object} config - Project config store state
 * @returns {Object} Validation result for each mode
 */
function validateModeSwitch(currentMode, capabilities, config) {
	const selectedCapabilities = Array.isArray(capabilities?.selectedCapabilities)
		? capabilities.selectedCapabilities
		: [];
	const configIsValid = Boolean(config?.isValid);

	return {
		[MODES.CAPABILITIES]: true,
		[MODES.CONFIGURATION]: selectedCapabilities.length > 0,
		[MODES.PREVIEW]: selectedCapabilities.length > 0 && configIsValid,
		[MODES.GENERATION]: selectedCapabilities.length > 0 && configIsValid
	};
}

/**
 * Mode switching actions
 */
export const modeActions = {
	/**
	 * Switches to the specified mode
	 * @param {string} targetMode - Mode to switch to
	 * @returns {boolean} Whether the switch was successful
	 */
	switchTo(targetMode) {
		// Ensure targetMode is a valid, known mode to prevent object injection.
		if (!Object.values(MODES).includes(targetMode)) {
			console.warn(`⚠️ Attempted to switch to invalid mode: ${targetMode}`);
			return false;
		}

		const current = get(modeStore);
		const capabilities = get(capabilityStore) || {};
		const config = get(projectConfigStore) || {};
		const validation = validateModeSwitch(current, capabilities, config);

		if (!validation[targetMode]) {
			console.warn(`⚠️ Cannot switch to ${targetMode} mode: validation failed`);
			return false;
		}

		modeStore.set(targetMode);
		console.log(`🔄 Switched to ${targetMode} mode`);
		return true;
	},

	/**
	 * Switches to capabilities mode
	 * @returns {boolean} Whether the switch was successful
	 */
	switchToCapabilities() {
		return modeActions.switchTo(MODES.CAPABILITIES);
	},

	/**
	 * Switches to configuration mode
	 * @returns {boolean} Whether the switch was successful
	 */
	switchToConfiguration() {
		return modeActions.switchTo(MODES.CONFIGURATION);
	},

	/**
	 * Switches to preview mode
	 * @returns {boolean} Whether the switch was successful
	 */
	switchToPreview() {
		return modeActions.switchTo(MODES.PREVIEW);
	},

	/**
	 * Switches to generation mode
	 * @returns {boolean} Whether the switch was successful
	 */
	switchToGeneration() {
		return modeActions.switchTo(MODES.GENERATION);
	},

	/**
	 * Goes to the next mode in sequence
	 * @returns {boolean} Whether the switch was successful
	 */
	nextMode() {
		const current = get(modeStore);
		const modeSequence = [MODES.CAPABILITIES, MODES.CONFIGURATION, MODES.PREVIEW, MODES.GENERATION];

		const currentIndex = modeSequence.indexOf(current);
		if (currentIndex === -1 || currentIndex >= modeSequence.length - 1) {
			return false;
		}

		const nextMode = modeSequence[currentIndex + 1];
		return modeActions.switchTo(nextMode);
	},

	/**
	 * Goes to the previous mode in sequence
	 * @returns {boolean} Whether the switch was successful
	 */
	previousMode() {
		const current = get(modeStore);
		const modeSequence = [MODES.CAPABILITIES, MODES.CONFIGURATION, MODES.PREVIEW, MODES.GENERATION];

		const currentIndex = modeSequence.indexOf(current);
		if (currentIndex <= 0) {
			return false;
		}

		const previousMode = modeSequence[currentIndex - 1];
		return modeActions.switchTo(previousMode);
	},

	/**
	 * Resets to the initial mode
	 */
	reset() {
		modeStore.set(MODES.CAPABILITIES);
		console.log('🔄 Reset to capabilities mode');
	}
};

/**
 * Mode navigation utilities
 */
export const modeNavigation = {
	/**
	 * Gets the next mode in sequence
	 * @param {string} currentMode - Current mode
	 * @returns {string|null} Next mode or null if at end
	 */
	getNextMode(currentMode) {
		const modeSequence = [MODES.CAPABILITIES, MODES.CONFIGURATION, MODES.PREVIEW, MODES.GENERATION];

		const currentIndex = modeSequence.indexOf(currentMode);
		if (currentIndex === -1 || currentIndex >= modeSequence.length - 1) {
			return null;
		}

		return modeSequence[currentIndex + 1];
	},

	/**
	 * Gets the previous mode in sequence
	 * @param {string} currentMode - Current mode
	 * @returns {string|null} Previous mode or null if at start
	 */
	getPreviousMode(currentMode) {
		const modeSequence = [MODES.CAPABILITIES, MODES.CONFIGURATION, MODES.PREVIEW, MODES.GENERATION];

		const currentIndex = modeSequence.indexOf(currentMode);
		if (currentIndex <= 0) {
			return null;
		}

		return modeSequence[currentIndex - 1];
	},

	/**
	 * Gets the mode display name
	 * @param {string} mode - Mode identifier
	 * @returns {string} Display name for the mode
	 */
	getModeDisplayName(mode) {
		const displayNames = {
			[MODES.CAPABILITIES]: 'Capabilities',
			[MODES.CONFIGURATION]: 'Configuration',
			[MODES.PREVIEW]: 'Preview',
			[MODES.GENERATION]: 'Generation'
		};

		if (Object.prototype.hasOwnProperty.call(displayNames, mode)) {
			return displayNames[mode];
		}
		return mode;
	},

	/**
	 * Gets the mode description
	 * @param {string} mode - Mode identifier
	 * @returns {string} Description for the mode
	 */
	getModeDescription(mode) {
		const descriptions = {
			[MODES.CAPABILITIES]: 'Select the capabilities you want to include in your project',
			[MODES.CONFIGURATION]: 'Configure project details and capability-specific options',
			[MODES.PREVIEW]: 'Preview the files and configurations that will be generated',
			[MODES.GENERATION]: 'Generate your project with all selected capabilities'
		};

		if (Object.prototype.hasOwnProperty.call(descriptions, mode)) {
			return descriptions[mode];
		}
		return '';
	},

	/**
	 * Gets the mode step number
	 * @param {string} mode - Mode identifier
	 * @returns {number} Step number (1-based)
	 */
	getModeStepNumber(mode) {
		const modeSequence = [MODES.CAPABILITIES, MODES.CONFIGURATION, MODES.PREVIEW, MODES.GENERATION];

		const stepNumber = modeSequence.indexOf(mode) + 1;
		return stepNumber > 0 ? stepNumber : 1;
	}
};

/**
 * Mode persistence utilities
 */
export const modePersistence = {
	/**
	 * Saves current mode to localStorage
	 * @param {string} mode - Mode to save
	 */
	saveMode(mode) {
		try {
			localStorage.setItem('genproj-current-mode', mode);
			console.log(`💾 Saved mode: ${mode}`);
		} catch (err) {
			console.warn('⚠️ Failed to save mode to localStorage:', err);
		}
	},

	/**
	 * Loads mode from localStorage
	 * @returns {string|null} Saved mode or null if not found
	 */
	loadMode() {
		try {
			const savedMode = localStorage.getItem('genproj-current-mode');
			if (savedMode && Object.values(MODES).includes(savedMode)) {
				console.log(`📂 Loaded mode: ${savedMode}`);
				return savedMode;
			}
		} catch (err) {
			console.warn('⚠️ Failed to load mode from localStorage:', err);
		}
		return null;
	},

	/**
	 * Clears saved mode from localStorage
	 */
	clearMode() {
		try {
			localStorage.removeItem('genproj-current-mode');
			console.log('🗑️ Cleared saved mode');
		} catch (err) {
			console.warn('⚠️ Failed to clear saved mode:', err);
		}
	}
};

// Auto-save mode changes
modeStore.subscribe((mode) => {
	modePersistence.saveMode(mode);
});

// Initialize from localStorage on first load
if (typeof globalThis !== 'undefined' && globalThis.window) {
	const savedMode = modePersistence.loadMode();
	if (savedMode) {
		modeStore.set(savedMode);
	}
}
