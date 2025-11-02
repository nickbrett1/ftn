import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

import {
	projectConfigStore,
	projectConfiguration,
	projectConfigMetadata,
	projectConfigValidation,
	projectConfigActions
} from '../../src/lib/client/project-config-store.js';

const createLocalStorageMock = () => ({
	setItem: vi.fn(),
	getItem: vi.fn(),
	removeItem: vi.fn()
});

describe('project-config-store', () => {
	let localStorageMock;
	let warnSpy;
	let logSpy;

	beforeEach(() => {
		localStorageMock = createLocalStorageMock();
		globalThis.localStorage = localStorageMock;
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		projectConfigActions.reset();
	});

	afterEach(() => {
		delete globalThis.localStorage;
		vi.restoreAllMocks();
	});

	it('sets configuration and persists to localStorage', () => {
		projectConfigActions.setConfiguration({ name: 'Example', nested: { enabled: true } });
		const storeValue = get(projectConfigStore);

		expect(storeValue.configuration).toEqual({ name: 'Example', nested: { enabled: true } });
		expect(storeValue.lastUpdated).not.toBeNull();
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'genproj-project-config',
			expect.stringContaining('"name":"Example"')
		);
	});

	it('updates configuration using updater function', () => {
		projectConfigActions.setConfiguration({ count: 1 });
		projectConfigActions.updateConfiguration((current) => ({ ...current, count: (current.count || 0) + 1 }));
		const config = get(projectConfiguration);
		expect(config).toEqual({ count: 2 });
	});

	it('sets metadata and validation state with normalization', () => {
		projectConfigActions.setMetadata({ author: 'dev', tags: ['a'] });
		projectConfigActions.setValidation({ isValid: 'truthy', errors: 'not-array' });

		expect(get(projectConfigMetadata)).toEqual({ author: 'dev', tags: ['a'] });
		expect(get(projectConfigValidation)).toEqual({ isValid: true, errors: [] });
	});

	it('resets store to initial state', () => {
		projectConfigActions.setConfiguration({ name: 'Temporary' });
		projectConfigActions.setMetadata({ author: 'temp' });
		projectConfigActions.setValidation({ isValid: true, errors: ['issue'] });

		projectConfigActions.reset();

		expect(get(projectConfigStore)).toEqual({
			configuration: {},
			metadata: {},
			isValid: false,
			validationErrors: [],
			lastUpdated: null
		});
	});

	it('persists provided snapshot to storage safely', () => {
		const snapshot = {
			configuration: { feature: true },
			metadata: { author: 'dev' },
			isValid: false,
			validationErrors: ['x']
		};

		projectConfigActions.persistToStorage(snapshot);

		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'genproj-project-config',
			expect.stringContaining('"feature":true')
		);
	});

	it('warns when persisting to storage fails', () => {
		localStorageMock.setItem.mockImplementation(() => {
			throw new Error('quota exceeded');
		});

		projectConfigActions.persistToStorage({ configuration: {} });

		expect(warnSpy).toHaveBeenCalled();
		const [message, error] = warnSpy.mock.calls.at(-1);
		expect(message).toContain('Failed to persist project config');
		expect(error).toBeInstanceOf(Error);
	});

	it('loads configuration from storage when available', () => {
		const storedValue = JSON.stringify({
			configuration: { name: 'Stored' },
			metadata: { author: 'stored' },
			isValid: true,
			validationErrors: ['warn'],
			timestamp: '2025-01-01T00:00:00.000Z'
		});
		localStorageMock.getItem.mockReturnValueOnce(storedValue);

		projectConfigActions.loadFromStorage();

		expect(get(projectConfigStore)).toEqual({
			configuration: { name: 'Stored' },
			metadata: { author: 'stored' },
			isValid: true,
			validationErrors: ['warn'],
			lastUpdated: '2025-01-01T00:00:00.000Z'
		});
		expect(logSpy).toHaveBeenCalled();
		expect(logSpy.mock.calls.at(-1)[0]).toContain('Loaded project config from localStorage');
	});

	it('warns when loading from storage fails', () => {
		localStorageMock.getItem.mockReturnValueOnce('not-json');

		projectConfigActions.loadFromStorage();

		expect(warnSpy).toHaveBeenCalled();
		const [message, error] = warnSpy.mock.calls.at(-1);
		expect(message).toContain('Failed to load project config from localStorage');
		expect(error).toBeInstanceOf(Error);
	});

	it('skips persistence when localStorage is unavailable', () => {
		delete globalThis.localStorage;
		expect(() => projectConfigActions.persistToStorage({ configuration: {} })).not.toThrow();
	});

	it('skips loading when localStorage is unavailable', () => {
		delete globalThis.localStorage;
		expect(() => projectConfigActions.loadFromStorage()).not.toThrow();
	});

	it('skips clearing stored configuration when localStorage is unavailable', () => {
		delete globalThis.localStorage;
		expect(() => projectConfigActions.clearStorage()).not.toThrow();
	});

	it('clears stored configuration', () => {
		projectConfigActions.clearStorage();
		expect(localStorageMock.removeItem).toHaveBeenCalledWith('genproj-project-config');
	});
});

describe('project-config-store module bootstrap', () => {
	it('loads from storage automatically when window exists', async () => {
		const bootstrapStorage = createLocalStorageMock();
		bootstrapStorage.getItem.mockReturnValueOnce(null);
		globalThis.window = {};
		globalThis.localStorage = bootstrapStorage;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const moduleSpecifier = `../../src/lib/client/project-config-store.js?bootstrap=${Math.random()}`;
		await import(moduleSpecifier);

		expect(bootstrapStorage.getItem).toHaveBeenCalledWith('genproj-project-config');
		logSpy.mockRestore();
		delete globalThis.window;
		delete globalThis.localStorage;
	});
});
