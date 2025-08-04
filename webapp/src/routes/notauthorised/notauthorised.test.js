import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
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

vi.mock('$lib/utils/particleConfig.js', () => ({
	createErrorParticleConfig: vi.fn(() => ({ mock: 'config' })),
	createAuthParticleConfig: vi.fn(() => ({ mock: 'config' }))
}));

describe('NotAuthorised Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the main title with glitch effect', () => {
		render(NotAuthorised);

		const titles = screen.getAllByText('ACCESS DENIED');
		expect(titles.length).toBe(3); // Main title + 2 glitch layers
		expect(titles[0].className).toContain('text-6xl');
		expect(titles[0].className).toContain('text-red-400');
	});

	it('renders authentication explanation section', () => {
		render(NotAuthorised);

		expect(screen.getByText('Authentication Required'));
		expect(screen.getByText(/Some tools on this site currently require authentication/));
	});

	it('renders information and insights section', () => {
		render(NotAuthorised);

		expect(screen.getByText('Looking for Information & Insights?'));
		expect(screen.getByText(/If you're interested in data engineering/));
	});

	it('renders quick re-authentication section', () => {
		render(NotAuthorised);

		expect(screen.getByText('Quick Re-authentication'));
		expect(screen.getByText(/If your session expired/));
	});

	it('has correct meta tags', () => {
		render(NotAuthorised);

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
		const { createAuthParticleConfig } = await import('$lib/utils/particleConfig.js');

		render(NotAuthorised);

		// Wait for onMount to complete
		await tick();

		expect(loadSlim).toHaveBeenCalledWith(tsParticles);
		expect(loadTextShape).toHaveBeenCalledWith(tsParticles);
		expect(createAuthParticleConfig).toHaveBeenCalled();
		expect(tsParticles.load).toHaveBeenCalledWith({
			id: 'notauthorised-particles',
			options: { mock: 'config' }
		});
	});

	it('has decorative elements', () => {
		render(NotAuthorised);

		// Check for the decorative dots at the bottom
		const container = document.querySelector('.opacity-60');
		expect(container).toBeTruthy();

		// Check for the particle container
		const particleContainer = document.querySelector('#notauthorised-particles');
		expect(particleContainer).toBeTruthy();
	});

	it('has proper styling classes', () => {
		render(NotAuthorised);

		// Check main container
		const mainContainer = document.querySelector('.min-h-screen');
		expect(mainContainer).toBeTruthy();

		// Check content sections have backdrop blur
		const sections = document.querySelectorAll('.backdrop-blur-sm');
		expect(sections.length).toBeGreaterThan(0);

		// Check for proper spacing
		const contentContainer = document.querySelector('.space-y-8');
		expect(contentContainer).toBeTruthy();
	});

	it('has responsive design classes', () => {
		render(NotAuthorised);

		// Check responsive text sizing
		const titles = screen.getAllByText('ACCESS DENIED');
		expect(titles[0].className).toContain('text-6xl');
		expect(titles[0].className).toContain('sm:text-7xl');

		// Check responsive container
		const container = document.querySelector('.max-w-3xl');
		expect(container).toBeTruthy();
	});

	it('has proper color scheme', () => {
		render(NotAuthorised);

		// Check red accent color for main title
		const titles = screen.getAllByText('ACCESS DENIED');
		expect(titles[0].className).toContain('text-red-400');

		// Check white color for authentication section (informational)
		const authRequiredTitle = screen.getByText('Authentication Required');
		expect(authRequiredTitle.className).toContain('text-gray-200');

		// Check blue accent for information section
		const infoTitle = screen.getByText('Looking for Information & Insights?');
		expect(infoTitle.className).toContain('text-blue-400');

		// Check yellow accent for re-authentication section
		const authTitle = screen.getByText('Quick Re-authentication');
		expect(authTitle.className).toContain('text-yellow-400');
	});

	it('has proper section structure', () => {
		render(NotAuthorised);

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
	});
});
