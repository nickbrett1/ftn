import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NotAuthorised from './+page.svelte';

// Mock tsParticles
vi.mock('@tsparticles/engine', () => ({
	tsParticles: {
		load: vi.fn()
	}
}));

vi.mock('@tsparticles/slim', () => ({
	loadSlim: vi.fn()
}));

vi.mock('@tsparticles/shape-text', () => ({
	loadTextShape: vi.fn()
}));

vi.mock('$lib/client/particleConfig.js', () => ({
	createErrorParticleConfig: vi.fn(() => ({ mock: 'config' })),
	createAuthParticleConfig: vi.fn(() => ({ mock: 'config' }))
}));

describe('NotAuthorised Page', () => {
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	it('renders the main title with glitch effect', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		const titles = Array.from(document.querySelectorAll('h1')).filter((h1) =>
			h1.textContent.includes('ACCESS DENIED')
		);
		expect(titles.length).toBe(3); // Main title + 2 glitch layers
		expect(titles[0].className).toContain('text-6xl');
		expect(titles[0].className).toContain('text-red-400');
	});

	it('renders authentication explanation section', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Authentication Required');
		expect(document.body.textContent).toContain(
			'Some tools on this site currently require authentication'
		);
	});

	it('renders information and insights section', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Looking for Information & Insights?');
		expect(document.body.textContent).toContain("If you're interested in data engineering");
	});

	it('renders quick re-authentication section', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Quick Re-authentication');
		expect(document.body.textContent).toContain('If your session expired');
	});

	it('has correct meta tags', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check that the head content is properly set
		const head = document.head;
		const title = head.querySelector('title');
		const meta = head.querySelector('meta[name="description"]');

		expect(title.textContent).toBe('Authentication Required');
		expect(meta.getAttribute('content')).toBe(
			'Authentication required - Some tools require login while under development'
		);
	});

	it('initializes particles on mount', async () => {
		const { tsParticles } = await import('@tsparticles/engine');
		const { loadSlim } = await import('@tsparticles/slim');
		const { loadTextShape } = await import('@tsparticles/shape-text');
		const { createAuthParticleConfig } = await import('$lib/client/particleConfig.js');

		component = mount(NotAuthorised, {
			target: document.body
		});

		// Wait for onMount to complete
		await vi.waitFor(
			() => {
				expect(loadSlim).toHaveBeenCalledWith(tsParticles);
			},
			{ timeout: 1000 }
		);

		expect(loadTextShape).toHaveBeenCalledWith(tsParticles);
		expect(createAuthParticleConfig).toHaveBeenCalled();
		expect(tsParticles.load).toHaveBeenCalledWith({
			id: 'notauthorised-particles',
			options: { mock: 'config' }
		});
	});

	it('has decorative elements', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check for the decorative dots at the bottom
		const container = document.querySelector('.opacity-60');
		expect(container).toBeTruthy();
	});

	it('has proper styling classes', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check for key styling classes
		const mainContainer = document.querySelector('.min-h-screen');
		expect(mainContainer).toBeTruthy();
		expect(mainContainer.className).toContain('flex');
		expect(mainContainer.className).toContain('items-center');
		expect(mainContainer.className).toContain('justify-center');
	});

	it('has responsive design classes', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check for responsive typography
		const title = Array.from(document.querySelectorAll('h1')).find((h1) =>
			h1.className.includes('text-6xl')
		);
		expect(title).toBeTruthy();
		expect(title.className).toContain('sm:text-7xl');
	});

	it('has proper color scheme', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check for color classes indicating the error/warning theme
		const title = Array.from(document.querySelectorAll('h1')).find((h1) =>
			h1.textContent.includes('ACCESS DENIED')
		);
		expect(title.className).toContain('text-red-400');
	});

	it('has proper section structure', () => {
		component = mount(NotAuthorised, {
			target: document.body
		});

		// Check that sections are properly structured
		const sections = document.querySelectorAll('.space-y-6, .space-y-8');
		expect(sections.length).toBeGreaterThan(0);
	});
});
