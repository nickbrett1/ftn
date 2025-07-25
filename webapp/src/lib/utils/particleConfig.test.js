import { describe, it, expect } from 'vitest';
import {
	generatePercentageValues,
	createFinancialParticleConfig,
	createErrorParticleConfig
} from './particleConfig.js';

describe('particleConfig utilities', () => {
	describe('generatePercentageValues', () => {
		it('should generate positive percentage values by default', () => {
			const values = generatePercentageValues(5);
			
			expect(values).toHaveLength(5);
			values.forEach(value => {
				expect(value).toMatch(/^\+\d+(\.\d{1,2})?%$/);
			});
		});

		it('should generate negative percentage values when specified', () => {
			const values = generatePercentageValues(5, false);
			
			expect(values).toHaveLength(5);
			values.forEach(value => {
				expect(value).toMatch(/^-\d+(\.\d{1,2})?%$/);
			});
		});

		it('should generate the correct number of values', () => {
			const values = generatePercentageValues(10);
			expect(values).toHaveLength(10);
		});

		it('should generate values within the expected range', () => {
			const values = generatePercentageValues(100);
			
			values.forEach(value => {
				const numericValue = parseFloat(value.replace(/[+\-%]/g, ''));
				expect(numericValue).toBeGreaterThanOrEqual(0);
				expect(numericValue).toBeLessThanOrEqual(15);
			});
		});
	});

	describe('createFinancialParticleConfig', () => {
		it('should return a complete particle configuration', () => {
			const config = createFinancialParticleConfig();
			
			// Check basic structure
			expect(config).toHaveProperty('fullScreen');
			expect(config).toHaveProperty('fpsLimit', 60);
			expect(config).toHaveProperty('interactivity');
			expect(config).toHaveProperty('particles');
			expect(config).toHaveProperty('detectRetina', true);
		});

		it('should have the correct particle shape configuration', () => {
			const config = createFinancialParticleConfig();
			
			expect(config.particles.shape.type).toBe('text');
			expect(config.particles.shape.options.text).toHaveLength(2);
			
			// Check positive percentage configuration
			const positiveConfig = config.particles.shape.options.text[0];
			expect(positiveConfig.particles.color).toBe('#00FF9E');
			expect(positiveConfig.value.every(v => v.startsWith('+'))).toBe(true);
			
			// Check negative percentage configuration
			const negativeConfig = config.particles.shape.options.text[1];
			expect(negativeConfig.particles.color).toBe('#FF0061');
			expect(negativeConfig.value.every(v => v.startsWith('-'))).toBe(true);
		});

		it('should accept and apply overrides', () => {
			const overrides = {
				fpsLimit: 30,
				particles: {
					number: { value: 10 }
				}
			};
			
			const config = createFinancialParticleConfig(overrides);
			
			expect(config.fpsLimit).toBe(30);
			expect(config.particles.number.value).toBe(10);
			// Should preserve other settings
			expect(config.detectRetina).toBe(true);
		});
	});

	describe('createErrorParticleConfig', () => {
		it('should return a complete particle configuration', () => {
			const config = createErrorParticleConfig();
			
			expect(config).toHaveProperty('fullScreen');
			expect(config).toHaveProperty('fpsLimit', 60);
			expect(config).toHaveProperty('interactivity');
			expect(config).toHaveProperty('particles');
			expect(config).toHaveProperty('detectRetina', true);
		});

		it('should have the correct error-specific configuration', () => {
			const config = createErrorParticleConfig();
			
			expect(config.particles.shape.type).toBe('text');
			expect(config.particles.shape.options.text).toHaveLength(2);
			expect(config.particles.number.value).toBe(15);
			
			// Check 404 configuration
			const fourOhFourConfig = config.particles.shape.options.text[0];
			expect(fourOhFourConfig.value).toEqual(['404', '404', '404']);
			expect(fourOhFourConfig.particles.color).toBe('#22c55e');
			
			// Check ERROR configuration
			const errorConfig = config.particles.shape.options.text[1];
			expect(errorConfig.value).toEqual(['ERROR', 'ERROR']);
			expect(errorConfig.particles.color).toBe('#FF0061');
		});

		it('should have different movement direction than financial config', () => {
			const financialConfig = createFinancialParticleConfig();
			const errorConfig = createErrorParticleConfig();
			
			expect(financialConfig.particles.move.direction).toBe('top');
			expect(errorConfig.particles.move.direction).toBe('none');
		});

		it('should accept and apply overrides', () => {
			const overrides = {
				fpsLimit: 45,
				particles: {
					number: { value: 25 },
					links: { opacity: 0.5 }
				}
			};
			
			const config = createErrorParticleConfig(overrides);
			
			expect(config.fpsLimit).toBe(45);
			expect(config.particles.number.value).toBe(25);
			expect(config.particles.links.opacity).toBe(0.5);
			// Should preserve other settings
			expect(config.detectRetina).toBe(true);
		});
	});

	describe('deep merge functionality', () => {
		it('should deeply merge nested configurations', () => {
			const overrides = {
				particles: {
					links: {
						opacity: 0.9
					},
					move: {
						speed: 2
					}
				}
			};
			
			const config = createFinancialParticleConfig(overrides);
			
			// Should override specific values
			expect(config.particles.links.opacity).toBe(0.9);
			expect(config.particles.move.speed).toBe(2);
			
			// Should preserve other nested values
			expect(config.particles.links.color).toBe('random');
			expect(config.particles.move.direction).toBe('top');
		});
	});
});