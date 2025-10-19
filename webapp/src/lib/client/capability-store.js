/**
 * Capability Selection State Management
 *
 * Svelte store for managing capability selection state across the genproj tool.
 * Provides reactive state management for capability selection, validation, and persistence.
 *
 * @fileoverview Client-side capability selection state management
 */

import { writable, derived } from 'svelte/store';
import {
	validateCapabilitySelection,
	getCapabilitySelectionSummary
} from '$lib/utils/capability-resolver.js';

// Initial state
const initialState = {
	selectedCapabilities: [],
	lastUpdated: null,
	isValid: true,
	validation: null,
	summary: null
};

// Create the main capability store
export const capabilityStore = writable(initialState);

// Derived stores for specific state slices
export const selectedCapabilities = derived(
	capabilityStore,
	($store) => $store.selectedCapabilities
);

export const capabilityValidation = derived(capabilityStore, ($store) => $store.validation);

export const capabilitySummary = derived(capabilityStore, ($store) => $store.summary);

export const isCapabilitySelectionValid = derived(capabilityStore, ($store) => $store.isValid);

// Store actions
export const capabilityActions = {
	/**
	 * Sets the selected capabilities and updates validation
	 * @param {string[]} capabilities - Array of selected capability IDs
	 */
	setSelectedCapabilities(capabilities) {
		capabilityStore.update((store) => {
			const newStore = {
				...store,
				selectedCapabilities: capabilities,
				lastUpdated: new Date().toISOString()
			};

			// Update validation
			if (capabilities.length > 0) {
				newStore.validation = validateCapabilitySelection(capabilities);
				newStore.summary = getCapabilitySelectionSummary(capabilities);
				newStore.isValid = newStore.validation.isValid;
			} else {
				newStore.validation = null;
				newStore.summary = null;
				newStore.isValid = true;
			}

			return newStore;
		});
	},

	/**
	 * Adds a capability to the selection
	 * @param {string} capabilityId - ID of the capability to add
	 */
	addCapability(capabilityId) {
		capabilityStore.update((store) => {
			if (store.selectedCapabilities.includes(capabilityId)) {
				return store; // Already selected
			}

			const newCapabilities = [...store.selectedCapabilities, capabilityId];
			return {
				...store,
				selectedCapabilities: newCapabilities,
				lastUpdated: new Date().toISOString()
			};
		});
	},

	/**
	 * Removes a capability from the selection
	 * @param {string} capabilityId - ID of the capability to remove
	 */
	removeCapability(capabilityId) {
		capabilityStore.update((store) => {
			const newCapabilities = store.selectedCapabilities.filter((id) => id !== capabilityId);
			return {
				...store,
				selectedCapabilities: newCapabilities,
				lastUpdated: new Date().toISOString()
			};
		});
	},

	/**
	 * Toggles a capability in the selection
	 * @param {string} capabilityId - ID of the capability to toggle
	 */
	toggleCapability(capabilityId) {
		capabilityStore.update((store) => {
			if (store.selectedCapabilities.includes(capabilityId)) {
				capabilityActions.removeCapability(capabilityId);
			} else {
				capabilityActions.addCapability(capabilityId);
			}
			return store; // Will be updated by the action calls
		});
	},

	/**
	 * Clears all selected capabilities
	 */
	clearSelection() {
		capabilityActions.setSelectedCapabilities([]);
	},

	/**
	 * Loads capabilities from URL parameters or localStorage
	 * @param {string[]} capabilities - Array of capability IDs to load
	 */
	loadCapabilities(capabilities) {
		capabilityActions.setSelectedCapabilities(capabilities);
	},

	/**
	 * Persists current selection to localStorage
	 */
	persistSelection() {
		capabilityStore.update((store) => {
			try {
				const data = {
					selectedCapabilities: store.selectedCapabilities,
					timestamp: new Date().toISOString()
				};
				localStorage.setItem('genproj-capabilities', JSON.stringify(data));
				console.log('💾 Persisted capability selection to localStorage');
			} catch (err) {
				console.warn('⚠️ Failed to persist capability selection:', err);
			}
			return store;
		});
	},

	/**
	 * Loads selection from localStorage
	 */
	loadFromStorage() {
		try {
			const stored = localStorage.getItem('genproj-capabilities');
			if (stored) {
				const data = JSON.parse(stored);
				capabilityActions.setSelectedCapabilities(data.selectedCapabilities || []);
				console.log('📂 Loaded capability selection from localStorage');
			}
		} catch (err) {
			console.warn('⚠️ Failed to load capability selection from localStorage:', err);
		}
	},

	/**
	 * Clears persisted selection from localStorage
	 */
	clearStorage() {
		try {
			localStorage.removeItem('genproj-capabilities');
			console.log('🗑️ Cleared capability selection from localStorage');
		} catch (err) {
			console.warn('⚠️ Failed to clear capability selection from localStorage:', err);
		}
	}
};

// Auto-persist changes to localStorage
capabilityStore.subscribe((store) => {
	if (store.lastUpdated) {
		// Debounce persistence to avoid excessive localStorage writes
		setTimeout(() => {
			capabilityActions.persistSelection();
		}, 1000);
	}
});

// Initialize from localStorage on first load
if (typeof globalThis !== 'undefined' && globalThis.window) {
	capabilityActions.loadFromStorage();
}
