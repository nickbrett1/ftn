import { vi } from 'vitest';

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
	browser: false,  // Revert to false to avoid breaking other tests
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
		hostname: 'localhost',  // ✅ Add hostname to fix Footer component
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
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

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
		// Simulate browser timing
		setTimeout(callback, 16); // ~60fps
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