import { describe, it, expect, afterEach, vi } from 'vitest';
import { get, writable } from 'svelte/store';

vi.mock(
	'$lib/client/capability-store.js',
	() => {
		const capabilityStore = writable({
			selectedCapabilities: [],
			isValid: false
		});
		return { capabilityStore };
	},
	{ virtual: true }
);

async function setup({ savedMode = null } = {}) {
	vi.resetModules();

	globalThis.localStorage = {
		setItem: vi.fn(),
		getItem: vi.fn().mockReturnValue(savedMode),
		removeItem: vi.fn()
	};
	globalThis.window = {};

	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});

	const capabilityModule = await import('$lib/client/capability-store.js');
	const projectModule = await import('$lib/client/project-config-store.js');
	projectModule.projectConfigActions.reset();
	const modeModule = await import('$lib/utils/mode-switcher.js');

	return {
		capabilityStore: capabilityModule.capabilityStore,
		projectConfigStore: projectModule.projectConfigStore,
		projectConfigActions: projectModule.projectConfigActions,
		...modeModule
	};
}

afterEach(() => {
	delete globalThis.window;
	delete globalThis.localStorage;
	vi.restoreAllMocks();
});

describe('mode-switcher utilities', () => {
	it('loads saved mode and persists switches', async () => {
		const { capabilityStore, projectConfigActions, currentMode, modeActions, MODES } = await setup({
			savedMode: 'preview'
		});

		expect(get(currentMode)).toBe(MODES.PREVIEW);

		capabilityStore.set({ selectedCapabilities: ['repo'], isValid: true });
		projectConfigActions.setValidation({ isValid: true });

		expect(modeActions.switchTo(MODES.GENERATION)).toBe(true);
		expect(get(currentMode)).toBe(MODES.GENERATION);
		expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
			'genproj-current-mode',
			MODES.GENERATION
		);
	});

	it('prevents invalid mode transitions', async () => {
		const { capabilityStore, projectConfigActions, modeActions, currentMode, MODES } =
			await setup();
		capabilityStore.set({ selectedCapabilities: [], isValid: false });
		projectConfigActions.setValidation({ isValid: false });

		expect(modeActions.switchTo(MODES.CONFIGURATION)).toBe(false);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining(`Cannot switch to ${MODES.CONFIGURATION}`)
		);
		expect(get(currentMode)).toBe(MODES.CAPABILITIES);
	});

	it('navigates sequentially with next and previous mode helpers', async () => {
		const { capabilityStore, projectConfigActions, modeActions, currentMode, MODES } =
			await setup();
		capabilityStore.set({ selectedCapabilities: ['cap'], isValid: true });
		projectConfigActions.setValidation({ isValid: true });

		expect(modeActions.nextMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.CONFIGURATION);
		expect(modeActions.nextMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.PREVIEW);
		expect(modeActions.nextMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.GENERATION);
		expect(modeActions.nextMode()).toBe(false);
		expect(modeActions.previousMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.PREVIEW);
		expect(modeActions.previousMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.CONFIGURATION);
		expect(modeActions.previousMode()).toBe(true);
		expect(get(currentMode)).toBe(MODES.CAPABILITIES);
		expect(modeActions.previousMode()).toBe(false);
	});

	it('provides navigation metadata helpers', async () => {
		const { modeNavigation, MODES } = await setup();
		expect(modeNavigation.getNextMode(MODES.CAPABILITIES)).toBe(MODES.CONFIGURATION);
		expect(modeNavigation.getPreviousMode(MODES.PREVIEW)).toBe(MODES.CONFIGURATION);
		expect(modeNavigation.getModeDisplayName(MODES.GENERATION)).toBe('Generation');
		expect(modeNavigation.getModeDescription(MODES.CONFIGURATION)).toContain('Configure');
		expect(modeNavigation.getModeStepNumber(MODES.PREVIEW)).toBe(3);
		expect(modeNavigation.getModeStepNumber('unknown')).toBe(1);
	});

	it('handles persistence errors gracefully', async () => {
		const { modePersistence, MODES } = await setup();
		const failure = new Error('nope');
		globalThis.localStorage.setItem.mockImplementationOnce(() => {
			throw failure;
		});
		modePersistence.saveMode(MODES.PREVIEW);
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Failed to save mode to localStorage:'),
			failure
		);

		const loadFailure = new Error('denied');
		globalThis.localStorage.getItem.mockImplementationOnce(() => {
			throw loadFailure;
		});
		expect(modePersistence.loadMode()).toBeNull();
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Failed to load mode from localStorage:'),
			loadFailure
		);

		globalThis.localStorage.removeItem.mockImplementationOnce(() => {
			throw failure;
		});
		modePersistence.clearMode();
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Failed to clear saved mode:'),
			failure
		);
	});

	it('ignores invalid saved modes and clears state', async () => {
		const { modePersistence, MODES } = await setup({ savedMode: 'invalid-mode' });
		expect(modePersistence.loadMode()).toBeNull();
		modePersistence.saveMode(MODES.CONFIGURATION);
		modePersistence.clearMode();
		expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith('genproj-current-mode');
	});
});
