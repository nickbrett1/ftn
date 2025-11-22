import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createFinancialParticleConfig,
	createErrorParticleConfig,
	createAuthParticleConfig,
	generatePercentageValues
} from '../../../src/lib/client/particleConfig.js';

describe('ParticleConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	describe('generatePercentageValues', () => {
		it('should generate positive percentage values', () => {
			const values = generatePercentageValues(5, true);
			expect(values).toHaveLength(5);
			for (const value of values) {
				expect(value).toMatch(/^\+[\d.]+%$/);
				const numberValue = Number.parseFloat(value.slice(1, -1));
				expect(numberValue).toBeGreaterThanOrEqual(0);
				expect(numberValue).toBeLessThanOrEqual(15);
			}
		});

		it('should generate negative percentage values', () => {
			const values = generatePercentageValues(5, false);
			expect(values).toHaveLength(5);
			for (const value of values) {
				expect(value).toMatch(/^-[\d.]+%$/);
				const numberValue = Number.parseFloat(value.slice(1, -1));
				expect(numberValue).toBeGreaterThanOrEqual(0);
				expect(numberValue).toBeLessThanOrEqual(15);
			}
		});

		it('should generate default number of values', () => {
			const values = generatePercentageValues();
			expect(values).toHaveLength(50);
		});

		it('should generate cryptographically secure values', () => {
			const values1 = generatePercentageValues(10, true);
			const values2 = generatePercentageValues(10, true);
			// Should be different due to crypto randomness
			expect(values1).not.toEqual(values2);
		});
	});

	describe('createFinancialParticleConfig', () => {
		it('should create financial particle configuration', () => {
			const config = createFinancialParticleConfig();

			expect(config).toHaveProperty('fullScreen.enable', true);
			expect(config).toHaveProperty('fpsLimit', 60);
			expect(config).toHaveProperty('particles.shape.type', 'text');
			expect(config.particles.shape.options.text).toHaveLength(2);

			// Check positive percentages (green)
			const positiveText = config.particles.shape.options.text[0];
			expect(positiveText.particles.color).toBe('#00FF9E');
			expect(positiveText.value).toHaveLength(50);

			// Check negative percentages (red)
			const negativeText = config.particles.shape.options.text[1];
			expect(negativeText.particles.color).toBe('#FF0061');
			expect(negativeText.value).toHaveLength(50);
		});

		it('should merge overrides correctly', () => {
			const overrides = {
				fpsLimit: 30,
				particles: {
					number: { value: 10 }
				}
			};

			const config = createFinancialParticleConfig(overrides);
			expect(config.fpsLimit).toBe(30);
			expect(config.particles.number.value).toBe(10);
			expect(config.particles.shape.type).toBe('text'); // Should still be text
		});

		it('should have correct particle movement direction', () => {
			const config = createFinancialParticleConfig();
			expect(config.particles.move.direction).toBe('top');
		});
	});

	describe('createErrorParticleConfig', () => {
		it('should create error particle configuration', () => {
			const config = createErrorParticleConfig();

			expect(config).toHaveProperty('fullScreen.enable', true);
			expect(config).toHaveProperty('fpsLimit', 60);
			expect(config).toHaveProperty('particles.shape.type', 'text');
			expect(config.particles.shape.options.text).toHaveLength(2);

			// Check 404 text (green)
			const error404Text = config.particles.shape.options.text[0];
			expect(error404Text.particles.color).toBe('#22c55e');
			expect(error404Text.value).toEqual(['404', '404', '404']);

			// Check ERROR text (red)
			const errorText = config.particles.shape.options.text[1];
			expect(errorText.particles.color).toBe('#FF0061');
			expect(errorText.value).toEqual(['ERROR', 'ERROR']);
		});

		it('should have correct particle movement direction', () => {
			const config = createErrorParticleConfig();
			expect(config.particles.move.direction).toBe('none');
		});

		it('should have correct link properties', () => {
			const config = createErrorParticleConfig();
			expect(config.particles.links.color).toBe('#22c55e');
			expect(config.particles.links.distance).toBe(150);
			expect(config.particles.links.opacity).toBe(0.3);
		});

		it('should merge overrides correctly', () => {
			const overrides = {
				fpsLimit: 30,
				particles: {
					number: { value: 5 }
				}
			};

			const config = createErrorParticleConfig(overrides);
			expect(config.fpsLimit).toBe(30);
			expect(config.particles.number.value).toBe(5);
			expect(config.particles.shape.type).toBe('text'); // Should still be text
		});
	});

	describe('createAuthParticleConfig', () => {
		it('should create auth particle configuration', () => {
			const config = createAuthParticleConfig();

			expect(config).toHaveProperty('fullScreen.enable', true);
			expect(config).toHaveProperty('fpsLimit', 60);
			expect(config).toHaveProperty('particles.shape.type', 'text');
			expect(config.particles.shape.options.text).toHaveLength(2);

			// Check AUTH text (green)
			const authText = config.particles.shape.options.text[0];
			expect(authText.particles.color).toBe('#22c55e');
			expect(authText.value).toEqual(['AUTH', 'AUTH', 'AUTH']);

			// Check LOGIN text (yellow/amber)
			const loginText = config.particles.shape.options.text[1];
			expect(loginText.particles.color).toBe('#fbbf24');
			expect(loginText.value).toEqual(['LOGIN', 'LOGIN']);
		});

		it('should have correct particle movement direction', () => {
			const config = createAuthParticleConfig();
			expect(config.particles.move.direction).toBe('none');
		});

		it('should have correct link properties', () => {
			const config = createAuthParticleConfig();
			expect(config.particles.links.color).toBe('#22c55e');
			expect(config.particles.links.distance).toBe(150);
			expect(config.particles.links.opacity).toBe(0.3);
		});

		it('should merge overrides correctly', () => {
			const overrides = {
				fpsLimit: 30,
				particles: {
					number: { value: 5 }
				}
			};

			const config = createAuthParticleConfig(overrides);
			expect(config.fpsLimit).toBe(30);
			expect(config.particles.number.value).toBe(5);
			expect(config.particles.shape.type).toBe('text'); // Should still be text
		});
	});

	describe('baseConfig properties', () => {
		it('should have correct base configuration for all configs', () => {
			const financialConfig = createFinancialParticleConfig();
			const errorConfig = createErrorParticleConfig();
			const authConfig = createAuthParticleConfig();

			for (const config of [financialConfig, errorConfig, authConfig]) {
				expect(config).toHaveProperty('fullScreen.enable', true);
				expect(config).toHaveProperty('fpsLimit', 60);
				expect(config).toHaveProperty('detectRetina', true);
				expect(config).toHaveProperty('interactivity.detect_on', 'canvas');
				expect(config).toHaveProperty('interactivity.events.onClick.enable', false);
				expect(config).toHaveProperty('interactivity.events.onHover.enable', true);
			}
		});
	});

	describe('deepMerge functionality', () => {
		it('should deep merge nested objects', () => {
			const overrides = {
				particles: {
					number: { value: 5 },
					opacity: { value: { min: 0.5, max: 1 } }
				}
			};

			const config = createFinancialParticleConfig(overrides);
			expect(config.particles.number.value).toBe(5);
			expect(config.particles.opacity.value.min).toBe(0.5);
			expect(config.particles.opacity.value.max).toBe(1);
			// Should preserve other properties
			expect(config.particles.shape.type).toBe('text');
		});

		it('should handle empty overrides', () => {
			const config = createFinancialParticleConfig({});
			expect(config).toHaveProperty('fullScreen.enable', true);
			expect(config).toHaveProperty('fpsLimit', 60);
		});
	});
});