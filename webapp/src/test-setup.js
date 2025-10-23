import { vi } from 'vitest';

// Mock @zerodevx/svelte-img to avoid .svelte file loading issues
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

// Mock svelte-awesome-icons to avoid .svelte file loading issues
vi.mock('svelte-awesome-icons', () => {
	// Create a mock component that returns a simple function
	const createMockIcon = (name) => {
		return function MockIcon() {
			return {
				$$: {},
				$set: vi.fn(),
				$on: vi.fn(),
				$destroy: vi.fn()
			};
		};
	};

	// Export all the icons that are used in the codebase
	const icons = {
		LinkedinInBrands: createMockIcon('LinkedinInBrands'),
		GithubBrands: createMockIcon('GithubBrands'),
		EnvelopeRegular: createMockIcon('EnvelopeRegular'),
		EnvelopeOpenRegular: createMockIcon('EnvelopeOpenRegular'),
		CreditCardRegular: createMockIcon('CreditCardRegular'),
		CreditCardSolid: createMockIcon('CreditCardSolid'),
		BuildingSolid: createMockIcon('BuildingSolid'),
		CalendarSolid: createMockIcon('CalendarSolid'),
		CheckCircleSolid: createMockIcon('CheckCircleSolid'),
		ChartLineSolid: createMockIcon('ChartLineSolid'),
		FileInvoiceDollarSolid: createMockIcon('FileInvoiceDollarSolid'),
		UserSecretSolid: createMockIcon('UserSecretSolid'),
		RobotSolid: createMockIcon('RobotSolid'),
		DatabaseSolid: createMockIcon('DatabaseSolid'),
		PenToSquareRegular: createMockIcon('PenToSquareRegular'),
		ToolboxSolid: createMockIcon('ToolboxSolid'),
		PlaneDepartureSolid: createMockIcon('PlaneDepartureSolid')
	};
	
	return icons;
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
	browser: false,
	dev: false,
	prerendering: false,
	version: 'test'
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
	},
	navigating: {
		subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
	},
	updated: {
		subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
	}
}));

// Mock window.location for tests
Object.defineProperty(window, 'location', {
	value: {
		hash: '',
		href: 'http://localhost:3000',
		pathname: '/',
		search: '',
		hostname: 'localhost',
		host: 'localhost:3000',
		port: '3000',
		protocol: 'http:',
		origin: 'http://localhost:3000'
	},
	writable: true
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver {
	constructor() {
		this.observe = vi.fn();
		this.unobserve = vi.fn();
		this.disconnect = vi.fn();
	}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
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
Object.defineProperty(window, 'requestAnimationFrame', {
	writable: true,
	value: vi.fn().mockImplementation(callback => {
		setTimeout(callback, 16);
		return 1;
	})
});

Object.defineProperty(window, 'cancelAnimationFrame', {
	writable: true,
	value: vi.fn()
});

// Mock performance.now for timing-sensitive code
Object.defineProperty(window, 'performance', {
	writable: true,
	value: {
		now: vi.fn(() => Date.now())
	}
});

// Mock DOMMatrix for PDF.js compatibility
class MockDOMMatrix {
	constructor() {
		this.a = 1;
		this.b = 0;
		this.c = 0;
		this.d = 1;
		this.e = 0;
		this.f = 0;
		this.m11 = 1;
		this.m12 = 0;
		this.m13 = 0;
		this.m14 = 0;
		this.m21 = 0;
		this.m22 = 1;
		this.m23 = 0;
		this.m24 = 0;
		this.m31 = 0;
		this.m32 = 0;
		this.m33 = 1;
		this.m34 = 0;
		this.m41 = 0;
		this.m42 = 0;
		this.m43 = 0;
		this.m44 = 1;
		this.is2D = true;
		this.isIdentity = true;
		this.translate = vi.fn();
		this.scale = vi.fn();
		this.rotate = vi.fn();
		this.skewX = vi.fn();
		this.skewY = vi.fn();
		this.multiply = vi.fn();
		this.flipX = vi.fn();
		this.flipY = vi.fn();
		this.inverse = vi.fn();
		this.transformPoint = vi.fn();
		this.toFloat32Array = vi.fn(() => new Float32Array([1, 0, 0, 1, 0, 0]));
		this.toFloat64Array = vi.fn(() => new Float64Array([1, 0, 0, 1, 0, 0]));
	}
}

global.DOMMatrix = MockDOMMatrix;

// Mock DOMPoint for PDF.js compatibility
class MockDOMPoint {
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		this.matrixTransform = vi.fn();
	}
}

global.DOMPoint = MockDOMPoint;

// Mock DOMRect for PDF.js compatibility
class MockDOMRect {
	constructor(x = 0, y = 0, width = 0, height = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.top = y;
		this.right = x + width;
		this.bottom = y + height;
		this.left = x;
		this.toJSON = vi.fn(() => ({ x, y, width, height, top: y, right: x + width, bottom: y + height, left: x }));
	}
}

global.DOMRect = MockDOMRect;

// Mock PDF.js worker for tests
// This prevents the worker from being loaded in tests
if (typeof globalThis !== 'undefined') {
	globalThis.__PDFJS_WORKER_MOCK__ = true;
}

// Set NODE_ENV to test for PDF.js configuration
if (typeof process !== 'undefined') {
	process.env.NODE_ENV = 'test';
}

// Configure Svelte 5 runes for testing
// This ensures runes work in the test environment
if (typeof globalThis !== 'undefined') {
	globalThis.__svelte_5_rune_context = true;
	globalThis.__svelte_5_rune_testing = true;
}

// Mock Svelte 5 runes for testing
// This is a workaround for the rune_outside_svelte error
const originalModule = globalThis.Module;
globalThis.Module = {
	...originalModule,
	rune_outside_svelte: () => {
		// Allow runes in test environment
		return false;
	}
};

// Mock svelte-awesome-icons to prevent file extension issues
// This is a more comprehensive mock that handles the file extension issue
const mockIconComponent = () => '<div data-testid="mock-icon">Icon</div>';

// Mock the entire svelte-awesome-icons module
vi.mock('svelte-awesome-icons', () => {
	const icons = {};
	
	// Create a proxy that returns a mock component function for any icon name
	return new Proxy(icons, {
		get(target, prop) {
			if (typeof prop === 'string') {
				return mockIconComponent;
			}
			return target[prop];
		},
		has(target, prop) {
			// Always return true for any property access
			return true;
		}
	});
});

// Mock the specific icon files that might be imported
vi.mock('svelte-awesome-icons/A0Solid.svelte', () => mockIconComponent);
vi.mock('svelte-awesome-icons/A1Solid.svelte', () => mockIconComponent);
vi.mock('svelte-awesome-icons/A2Solid.svelte', () => mockIconComponent);

// Mock @zerodevx/svelte-img to prevent file extension issues
vi.mock('@zerodevx/svelte-img', () => ({
	SvelteImg: mockIconComponent
}));

// DISABLED: Global test lifecycle cleanup - was causing hangs during file transitions
// The cleanup in individual test files should be sufficient
// if (typeof afterEach !== 'undefined') {
// 	afterEach(() => {
// 		// Force cleanup of any remaining timers
// 		vi.clearAllTimers();
// 		// Clear any remaining mocks
// 		vi.clearAllMocks();
// 	});
// }
