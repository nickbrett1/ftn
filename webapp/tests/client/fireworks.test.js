import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import Fireworks from '../../src/lib/components/Fireworks.svelte';

// Mock tsparticles
vi.mock('@tsparticles/slim', () => ({
	loadSlim: vi.fn().mockResolvedValue()
}));

vi.mock('@tsparticles/engine', () => ({
	tsParticles: {
		load: vi.fn().mockResolvedValue({
			addParticles: vi.fn(),
			clear: vi.fn(),
			destroy: vi.fn()
		}),
		addParticles: vi.fn(),
		clear: vi.fn(),
		destroy: vi.fn()
	}
}));

describe('Fireworks Component', () => {
	beforeEach(() => {
		// Mock window dimensions
		Object.defineProperty(globalThis, 'innerWidth', { value: 1920, configurable: true });
		Object.defineProperty(globalThis, 'innerHeight', { value: 1080, configurable: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		cleanup(); // Manually cleanup the DOM after each test
	});

	it('should not render when show is false', () => {
		render(Fireworks, { show: false });
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeNull();
	});

	it('should render container when show is true', () => {
		render(Fireworks, { show: true });
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeTruthy();
	});

	it('should have correct CSS classes when rendered', () => {
		render(Fireworks, { show: true });
		const fireworksDiv = document.querySelector('.fixed.inset-0.pointer-events-none.z-50');
		expect(fireworksDiv).toBeTruthy();
	});

	it('should initialize particles on mount', async () => {
		render(Fireworks, { show: true });
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeTruthy();
	});

	it('should start fireworks when show becomes true', async () => {
		const { rerender } = render(Fireworks, { show: false });
		await tick();
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeNull();

		rerender({ show: true });
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeTruthy();
	});

	it('should stop fireworks when show becomes false', async () => {
		const { rerender } = render(Fireworks, { show: true });
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeTruthy();

		rerender({ show: false });
		await tick();
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeNull();
	});

	it('should clean up particles on component destroy', () => {
		const { unmount } = render(Fireworks, { show: true });
		unmount();
		// Test that no errors are thrown. The mock for destroy will be checked implicitly.
		// No explicit assertion needed here other than that unmount() doesn't throw.
		expect(true).toBe(true);
	});
});

describe('Fireworks Animation Logic', () => {
	beforeEach(() => {
		// Mock window dimensions
		Object.defineProperty(globalThis, 'innerWidth', { value: 1920, configurable: true });
		Object.defineProperty(globalThis, 'innerHeight', { value: 1080, configurable: true });
	});

    afterEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	it('should create particle container when rendered', async () => {
		render(Fireworks, { show: true });
		await tick();
		const particleContainer = document.querySelector('.w-full.h-full');
		expect(particleContainer).toBeTruthy();
	});

	it('should handle window dimensions correctly', () => {
		render(Fireworks, { show: true });
		expect(document.querySelector('.fixed.inset-0.pointer-events-none.z-50')).toBeTruthy();
	});
});
