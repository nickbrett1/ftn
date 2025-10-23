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
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the main title with glitch effect', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		const titles = document.querySelectorAll('h1');
		expect(titles.length).toBe(3); // Main title + 2 glitch layers
		expect(titles[0].className).toContain('text-6xl');
		expect(titles[0].className).toContain('text-red-400');

		unmount(component);
	});

	it('renders authentication explanation section', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.querySelector('h2').textContent).toBe('Authentication Required');
		expect(document.body.textContent).toContain('Some tools on this site currently require authentication');

		unmount(component);
	});

	it('renders information and insights section', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Looking for Information & Insights?');
		expect(document.body.textContent).toContain('If you\'re interested in data engineering');

		unmount(component);
	});

	it('renders quick re-authentication section', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		expect(document.body.textContent).toContain('Quick Re-authentication');
		expect(document.body.textContent).toContain('If your session expired');

		unmount(component);
	});

	it('has correct meta tags', () => {
		const component = mount(NotAuthorised, {
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

		unmount(component);
	});

	it('initializes particles on mount', async () => {
		const { tsParticles } = await import('@tsparticles/engine');
		const { loadSlim } = await import('@tsparticles/slim');
		const { loadTextShape } = await import('@tsparticles/shape-text');
		const { createAuthParticleConfig } = await import('$lib/client/particleConfig.js');

		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Wait for onMount to complete
		flushSync();

		expect(loadSlim).toHaveBeenCalledWith(tsParticles);
		expect(loadTextShape).toHaveBeenCalledWith(tsParticles);
		expect(createAuthParticleConfig).toHaveBeenCalled();
		expect(tsParticles.load).toHaveBeenCalledWith({
			id: 'notauthorised-particles',
			options: { mock: 'config' }
		});

		unmount(component);
	});

	it('has decorative elements', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Check for the decorative dots at the bottom
		const container = document.querySelector('.opacity-60');
		expect(container).toBeTruthy();

		// Check for the particle container
		const particleContainer = document.querySelector('#notauthorised-particles');
		expect(particleContainer).toBeTruthy();

		unmount(component);
	});

	it('has proper styling classes', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Check main container
		const mainContainer = document.querySelector('.min-h-screen');
		expect(mainContainer).toBeTruthy();

		// Check content sections have backdrop blur
		const sections = document.querySelectorAll('.backdrop-blur-sm');
		expect(sections.length).toBeGreaterThan(0);

		// Check for proper spacing
		const contentContainer = document.querySelector('.space-y-8');
		expect(contentContainer).toBeTruthy();

		unmount(component);
	});

	it('has responsive design classes', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Check responsive text sizing
		const titles = document.querySelectorAll('h1');
		expect(titles[0].className).toContain('text-6xl');
		expect(titles[0].className).toContain('sm:text-7xl');

		// Check responsive container
		const container = document.querySelector('.max-w-3xl');
		expect(container).toBeTruthy();

		unmount(component);
	});

	it('has proper color scheme', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Check red accent color for main title
		const titles = document.querySelectorAll('h1');
		expect(titles[0].className).toContain('text-red-400');

		// Check white color for authentication section (informational)
		const authRequiredTitle = document.querySelector('h2');
		expect(authRequiredTitle.className).toContain('text-gray-200');

		// Check blue accent for information section
		const infoTitle = document.querySelector('h3');
		expect(infoTitle.className).toContain('text-blue-400');

		// Check yellow accent for re-authentication section
		const authTitles = document.querySelectorAll('h3');
		expect(authTitles[1].className).toContain('text-yellow-400');

		unmount(component);
	});

	it('has proper section structure', () => {
		const component = mount(NotAuthorised, {
			target: document.body
		});

		// Check that all three main sections are present
		const sections = document.querySelectorAll('.bg-gray-900\\/50');
		expect(sections.length).toBe(3);

		// Check that each section has the correct border colors
		const grayBorder = document.querySelector('.border-gray-400\\/30');
		const blueBorder = document.querySelector('.border-blue-400\\/30');
		const yellowBorder = document.querySelector('.border-yellow-400\\/30');

		expect(grayBorder).toBeTruthy();
		expect(blueBorder).toBeTruthy();
		expect(yellowBorder).toBeTruthy();

		unmount(component);
	});
});
