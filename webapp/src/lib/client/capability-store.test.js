import { describe, it, expect, afterEach, vi } from 'vitest';

const resolverMocks = vi.hoisted(() => ({
	validateCapabilitySelection: vi.fn(() => ({ isValid: true, errors: [] })),
	getCapabilitySelectionSummary: vi.fn(() => ({ total: 0 }))
}));

vi.mock('$lib/utils/capability-resolver.js', () => resolverMocks);

function createLocalStorageMock(initialValue = null) {
	const store = {
		setItem: vi.fn(),
		getItem: vi.fn(() => initialValue),
		removeItem: vi.fn()
	};

	globalThis.window = {};
	globalThis.localStorage = store;

	return store;
}

async function loadCapabilityStore(initialStorageValue = null, { stubPersist = true } = {}) {
	vi.resetModules();
	vi.useFakeTimers();

	const storageMocks = createLocalStorageMock(initialStorageValue);
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	resolverMocks.validateCapabilitySelection.mockClear();
	resolverMocks.getCapabilitySelectionSummary.mockClear();

	// Ensure mocked resolver exports are configured before importing the store
	const resolver = await import('$lib/utils/capability-resolver.js');
	resolver.validateCapabilitySelection.mockImplementation((selection) => ({
		isValid: selection.length > 0,
		errors: selection.length > 0 ? [] : ['no selection']
	}));
	resolver.getCapabilitySelectionSummary.mockImplementation((selection) => ({
		count: selection.length
	}));

	const module = await import('./capability-store.js');
	if (stubPersist) {
		vi.spyOn(module.capabilityActions, 'persistSelection').mockImplementation(() => {});
	}
	return { ...module, storageMocks, resolver };
}

describe('capability-store', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		delete globalThis.window;
		delete globalThis.localStorage;
	});

	it('updates selection and validation when setSelectedCapabilities is called', async () => {
		const { capabilityStore, capabilityActions, resolver } = await loadCapabilityStore(null, {
			stubPersist: true
		});
		const validationResult = { isValid: false, errors: ['missing dependency'] };
		const summaryResult = { count: 2 };
		resolver.validateCapabilitySelection.mockReturnValue(validationResult);
		resolver.getCapabilitySelectionSummary.mockReturnValue(summaryResult);

		capabilityActions.setSelectedCapabilities(['circleci', 'sonarcloud']);
		vi.runAllTimers();

		let latest;
		const unsubscribe = capabilityStore.subscribe((value) => {
			latest = value;
		});
		unsubscribe();

		expect(latest.selectedCapabilities).toEqual(['circleci', 'sonarcloud']);
		expect(latest.validation).toBe(validationResult);
		expect(latest.summary).toBe(summaryResult);
		expect(latest.isValid).toBe(validationResult.isValid);
		expect(resolver.validateCapabilitySelection).toHaveBeenCalledWith(['circleci', 'sonarcloud']);
		expect(resolver.getCapabilitySelectionSummary).toHaveBeenCalledWith(['circleci', 'sonarcloud']);
	});

	it('clears validation state when selection becomes empty', async () => {
		const { capabilityStore, capabilityActions } = await loadCapabilityStore();
		capabilityActions.setSelectedCapabilities(['doppler']);
		capabilityActions.setSelectedCapabilities([]);
		vi.runAllTimers();

		let latest;
		const unsubscribe = capabilityStore.subscribe((value) => {
			latest = value;
		});
		unsubscribe();

		expect(latest.selectedCapabilities).toEqual([]);
		expect(latest.validation).toBeNull();
		expect(latest.summary).toBeNull();
		expect(latest.isValid).toBe(true);
	});

	it('adds, toggles, and removes capabilities without duplication', async () => {
		const { capabilityStore, capabilityActions } = await loadCapabilityStore();
		capabilityActions.addCapability('doppler');
		capabilityActions.addCapability('doppler');
		capabilityActions.toggleCapability('doppler'); // should remove
		capabilityActions.toggleCapability('doppler'); // add again via toggle
		capabilityActions.removeCapability('doppler');
		vi.runAllTimers();

		let latest;
		const unsubscribe = capabilityStore.subscribe((value) => {
			latest = value;
		});
		unsubscribe();

		expect(latest.selectedCapabilities).toEqual([]);
	});

	it('persists selection to localStorage after debounce', async () => {
		const { capabilityActions, storageMocks } = await loadCapabilityStore(null, {
			stubPersist: false
		});
		capabilityActions.setSelectedCapabilities(['devcontainer-node']);
		vi.advanceTimersByTime(1000);

		expect(storageMocks.setItem).toHaveBeenCalledTimes(1);
		const [key, value] = storageMocks.setItem.mock.calls[0];
		expect(key).toBe('genproj-capabilities');
		const parsed = JSON.parse(value);
		expect(parsed.selectedCapabilities).toEqual(['devcontainer-node']);
	});

	it('loads selection from storage on initialization', async () => {
		const storedValue = JSON.stringify({ selectedCapabilities: ['cloudflare-wrangler'] });
		const { capabilityStore, storageMocks } = await loadCapabilityStore(storedValue);
		vi.runAllTimers();

		expect(storageMocks.getItem).toHaveBeenCalledWith('genproj-capabilities');

		let latest;
		const unsubscribe = capabilityStore.subscribe((value) => {
			latest = value;
		});
		unsubscribe();

		expect(latest.selectedCapabilities).toEqual(['cloudflare-wrangler']);
	});

	it('clears stored selection when clearStorage is invoked', async () => {
		const { capabilityActions, storageMocks } = await loadCapabilityStore();
		capabilityActions.clearStorage();

		expect(storageMocks.removeItem).toHaveBeenCalledWith('genproj-capabilities');
	});
});
