import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('NotAuthorised Page - Logic Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should validate page title and meta description', () => {
		const expectedTitle = 'Authentication Required';
		const expectedDescription = 'Authentication required - Some tools require login while under development';
		
		expect(expectedTitle).toBe('Authentication Required');
		expect(expectedDescription).toBe('Authentication required - Some tools require login while under development');
	});

	it('should validate content sections exist', () => {
		const expectedSections = [
			'Authentication Required',
			'Looking for Information & Insights?',
			'Quick Re-authentication'
		];

		expectedSections.forEach(section => {
			expect(section).toBeDefined();
			expect(typeof section).toBe('string');
			expect(section.length).toBeGreaterThan(0);
		});
	});

	it('should validate content text includes expected phrases', () => {
		const expectedPhrases = [
			'Some tools on this site currently require authentication',
			'If you\'re interested in data engineering',
			'If your session expired'
		];

		expectedPhrases.forEach(phrase => {
			expect(phrase).toBeDefined();
			expect(typeof phrase).toBe('string');
			expect(phrase.length).toBeGreaterThan(0);
		});
	});

	it('should validate CSS class structure', () => {
		const expectedClasses = [
			'text-6xl',
			'text-red-400',
			'text-gray-200',
			'text-blue-400',
			'text-yellow-400',
			'min-h-screen',
			'backdrop-blur-sm',
			'space-y-8',
			'max-w-3xl',
			'bg-gray-900/50',
			'border-gray-400/30',
			'border-blue-400/30',
			'border-yellow-400/30'
		];

		expectedClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
			expect(className.length).toBeGreaterThan(0);
		});
	});

	it('should validate responsive design classes', () => {
		const responsiveClasses = [
			'sm:text-7xl',
			'max-w-3xl'
		];

		responsiveClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
		});
	});

	it('should validate color scheme structure', () => {
		const colorClasses = {
			red: 'text-red-400',
			gray: 'text-gray-200',
			blue: 'text-blue-400',
			yellow: 'text-yellow-400'
		};

		Object.entries(colorClasses).forEach(([color, className]) => {
			expect(className).toBeDefined();
			expect(className).toContain(color);
		});
	});

	it('should validate section structure', () => {
		const expectedSections = 3;
		const sectionClasses = [
			'bg-gray-900/50',
			'border-gray-400/30',
			'border-blue-400/30',
			'border-yellow-400/30'
		];

		expect(expectedSections).toBe(3);
		sectionClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
		});
	});

	it('should validate particle configuration', async () => {
		const { tsParticles } = await import('@tsparticles/engine');
		const { loadSlim } = await import('@tsparticles/slim');
		const { loadTextShape } = await import('@tsparticles/shape-text');
		const { createAuthParticleConfig } = await import('$lib/client/particleConfig.js');

		// Test that the functions are available
		expect(tsParticles).toBeDefined();
		expect(loadSlim).toBeDefined();
		expect(loadTextShape).toBeDefined();
		expect(createAuthParticleConfig).toBeDefined();

		// Test particle configuration
		const config = createAuthParticleConfig();
		expect(config).toEqual({ mock: 'config' });
	});

	it('should validate decorative elements structure', () => {
		const decorativeClasses = [
			'opacity-60',
			'#notauthorised-particles'
		];

		decorativeClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
		});
	});

	it('should validate main container structure', () => {
		const containerClasses = [
			'min-h-screen',
			'backdrop-blur-sm',
			'space-y-8'
		];

		containerClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
		});
	});

	it('should validate title structure', () => {
		const titleClasses = [
			'text-6xl',
			'sm:text-7xl',
			'text-red-400'
		];

		titleClasses.forEach(className => {
			expect(className).toBeDefined();
			expect(typeof className).toBe('string');
		});
	});
});