import { writable, derived, get } from 'svelte/store';

const initialState = {
	configuration: {},
	metadata: {},
	isValid: false,
	validationErrors: [],
	lastUpdated: null
};

export const projectConfigStore = writable(initialState);

export const projectConfiguration = derived(projectConfigStore, ($store) => $store.configuration);
export const projectConfigMetadata = derived(projectConfigStore, ($store) => $store.metadata);
export const projectConfigValidation = derived(projectConfigStore, ($store) => ({
	isValid: $store.isValid,
	errors: $store.validationErrors
}));

export const projectConfigActions = {
	setConfiguration(configuration) {
		projectConfigStore.update((store) => ({
			...store,
			configuration: { ...configuration },
			lastUpdated: new Date().toISOString()
		}));
	},

	updateConfiguration(updater) {
		projectConfigStore.update((store) => {
			const current = typeof updater === 'function' ? updater(store.configuration) : updater;
			return {
				...store,
				configuration: { ...current },
				lastUpdated: new Date().toISOString()
			};
		});
	},

	setMetadata(metadata) {
		projectConfigStore.update((store) => ({
			...store,
			metadata: { ...metadata }
		}));
	},

	setValidation({ isValid, errors = [] }) {
		projectConfigStore.update((store) => ({
			...store,
			isValid: Boolean(isValid),
			validationErrors: Array.isArray(errors) ? [...errors] : []
		}));
	},

	reset() {
		projectConfigStore.set({ ...initialState });
	},

	persistToStorage(snapshot) {
		const store = snapshot ?? get(projectConfigStore);
		try {
			if (typeof localStorage !== 'undefined') {
				const payload = {
					configuration: store.configuration,
					metadata: store.metadata,
					isValid: store.isValid,
					validationErrors: store.validationErrors,
					timestamp: new Date().toISOString()
				};
				localStorage.setItem('genproj-project-config', JSON.stringify(payload));
			}
		} catch (error) {
			console.warn('⚠️ Failed to persist project config:', error);
		}
	},

	loadFromStorage() {
		try {
			if (typeof localStorage === 'undefined') return;
			const stored = localStorage.getItem('genproj-project-config');
			if (!stored) return;
			const parsed = JSON.parse(stored);
			projectConfigStore.set({
				configuration: parsed.configuration ?? {},
				metadata: parsed.metadata ?? {},
				isValid: Boolean(parsed.isValid),
				validationErrors: Array.isArray(parsed.validationErrors) ? parsed.validationErrors : [],
				lastUpdated: parsed.timestamp ?? null
			});
			console.log('📂 Loaded project config from localStorage');
		} catch (error) {
			console.warn('⚠️ Failed to load project config from localStorage:', error);
		}
	},

	clearStorage() {
		try {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('genproj-project-config');
				console.log('🗑️ Cleared project config from localStorage');
			}
		} catch (error) {
			console.warn('⚠️ Failed to clear project config from localStorage:', error);
		}
	}
};

projectConfigStore.subscribe((store) => {
	if (store.lastUpdated) {
		projectConfigActions.persistToStorage(store);
	}
});

if (typeof globalThis !== 'undefined' && globalThis.window) {
	projectConfigActions.loadFromStorage();
}

