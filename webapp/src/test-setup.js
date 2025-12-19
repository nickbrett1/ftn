import { vi } from 'vitest';
import { writable } from 'svelte/store';
import '@testing-library/jest-dom/vitest';

// Set NODE_ENV to test for proper rune handling
if (typeof process !== 'undefined') {
	process.env.NODE_ENV = 'test';
}

// Mock @zerodevx/svelte-img to avoid .svelte file extension errors
vi.mock('@zerodevx/svelte-img', () => ({
	default: function MockSvelteImg() {
		return {
			$$: {},
			$set: vi.fn(),
			$on: vi.fn(),
			$destroy: vi.fn()
		};
	}
}));

// Mock svelte-awesome-icons to avoid .svelte file extension errors
vi.mock('svelte-awesome-icons', () => {
	const createMockIcon = () =>
		function MockIcon() {
			return {
				$$: {},
				$set: vi.fn(),
				$on: vi.fn(),
				$destroy: vi.fn()
			};
		};

	return {
		LinkedinInBrands: createMockIcon(),
		GithubBrands: createMockIcon(),
		EnvelopeRegular: createMockIcon(),
		EnvelopeOpenRegular: createMockIcon(),
		CreditCardRegular: createMockIcon(),
		CreditCardSolid: createMockIcon(),
		BuildingSolid: createMockIcon(),
		CalendarSolid: createMockIcon(),
		CheckCircleSolid: createMockIcon(),
		ChartLineSolid: createMockIcon(),
		FileInvoiceDollarSolid: createMockIcon(),
		UserSecretSolid: createMockIcon(),
		RobotSolid: createMockIcon(),
		DatabaseSolid: createMockIcon(),
		PenToSquareRegular: createMockIcon(),
		ToolboxSolid: createMockIcon(),
		PlaneDepartureSolid: createMockIcon(),
		ToolsSolid: createMockIcon(),
		RocketSolid: createMockIcon(),
		PythonBrands: createMockIcon(),
		NodeJsBrands: createMockIcon(),
		JavaBrands: createMockIcon(),
		DockerBrands: createMockIcon(),
		CloudflareBrands: createMockIcon(),
		CircleNotchSolid: createMockIcon(),
		CloudSolid: createMockIcon(),
		CodeSolid: createMockIcon(),
		PlayCircleSolid: createMockIcon(),
		FileAltSolid: createMockIcon(),
		GlobeSolid: createMockIcon(),
		ChevronDownSolid: createMockIcon(),
		ChevronUpSolid: createMockIcon(),
		InfoCircleSolid: createMockIcon()
	};
});

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn(),
	onNavigate: vi.fn(),
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: false, // Revert to false to avoid breaking other tests
	dev: false,
	prerendering: false,
	version: 'test'
}));

// Create a writable store for the page data, so tests can update it
const mockPageData = writable({
	url: new URL('http://localhost'),
	params: {},
	route: {
		id: null
	},
	status: 200,
	error: null,
	data: {
		user: {
			email: 'test@example.com',
			name: 'Test User'
		}
	},
	form: undefined
});

vi.mock('$app/stores', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		page: mockPageData // Use the writable store
	};
});

// Mock Cloudflare platform bindings
beforeEach(() => {
	mockPageData.update((data) => ({
		...data,
		platform: {
			env: {
				KV: {
					get: vi.fn(),
					put: vi.fn(),
					delete: vi.fn()
				},
				R2_CCBILLING: {
					get: vi.fn(),
					put: vi.fn(),
					delete: vi.fn()
				},
				D1: {
					prepare: vi.fn(() => ({
						bind: vi.fn().mockReturnThis(),
						all: vi.fn(),
						first: vi.fn(),
						run: vi.fn()
					}))
				}
			}
		}
	}));
});

// Export a function to allow tests to set the user
export function setMockUser(user) {
	mockPageData.update((current) => ({
		...current,
		data: {
			...current.data,
			user
		}
	}));
}

// Mock window.location for tests
Object.defineProperty(globalThis, 'location', {
	value: {
		hash: '',
		href: 'http://localhost:3000',
		pathname: '/',
		search: '',
		hostname: 'localhost', // ✅ Add hostname to fix Footer component
		host: 'localhost:3000',
		port: '3000',
		protocol: 'http:',
		origin: 'http://localhost:3000'
	},
	writable: true
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Add browser-like behavior for better production simulation
Object.defineProperty(globalThis, 'requestAnimationFrame', {
	writable: true,
	value: vi.fn().mockImplementation((callback) => {
		// Simulate browser timing
		setTimeout(callback, 16); // ~60fps
		return 1;
	})
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
	writable: true,
	value: vi.fn()
});

// Mock performance.now for timing-sensitive code
Object.defineProperty(globalThis, 'performance', {
	writable: true,
	value: {
		now: vi.fn(() => Date.now())
	}
});

// Mock Element.prototype.animate for Svelte transitions in JSDOM
Element.prototype.animate = vi.fn().mockImplementation(() => ({
	finished: Promise.resolve(),
	onfinish: null,
	cancel: vi.fn(),
	play: vi.fn(),
	pause: vi.fn(),
	reverse: vi.fn(),
}));
