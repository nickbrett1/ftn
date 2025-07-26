/**
 * Particle configuration utilities for tsParticles
 * Provides reusable, configurable particle effects for the application
 * 
 * SECURITY NOTE: This module uses crypto.getRandomValues() for cryptographically
 * secure random number generation, following security best practices even for
 * visual effects that don't strictly require this level of security.
 */

/**
 * Generate a cryptographically secure random float between 0 and 1
 * @returns {number} Cryptographically secure random float between 0 and 1
 */
const getSecureRandom = () => {
	const randomBytes = new Uint32Array(1);
	crypto.getRandomValues(randomBytes);
	return randomBytes[0] / (0xFFFFFFFF + 1);
};

/**
 * Generate cryptographically secure random percentage values for financial-themed particles
 * 
 * Uses crypto.getRandomValues() for cryptographically secure random number generation.
 * While this level of security isn't strictly necessary for visual effects, it eliminates
 * any potential security concerns and follows security best practices.
 * 
 * @param {number} count - Number of values to generate
 * @param {boolean} positive - Whether to generate positive (+) or negative (-) values
 * @returns {string[]} Array of formatted percentage strings for visual display
 */
export const generatePercentageValues = (count = 50, positive = true) => {
	return Array.from(
		{ length: count },
		() => {
			// Generate cryptographically secure random percentage between 0.01 and 15.00
			const value = getSecureRandom() * 15;
			const rounded = Math.round(value * 100) / 100;
			const sign = positive ? '+' : '-';
			return `${sign}${rounded.toFixed(2)}%`;
		}
	);
};

/**
 * Base particle configuration with common settings
 */
const baseConfig = {
	fullScreen: {
		enable: true,
		zIndex: -1
	},
	fpsLimit: 60,
	interactivity: {
		detect_on: 'canvas',
		events: {
			onClick: { enable: false, mode: 'push' },
			onHover: {
				enable: true,
				mode: 'connect',
				parallax: { enable: false, force: 60, smooth: 10 }
			},
			resize: true
		},
		modes: {
			bubble: { distance: 400, duration: 2, opacity: 0.8, size: 40, speed: 3 },
			grab: { distance: 400, lineLinked: { opacity: 1 } },
			push: { quantity: 4 },
			remove: { quantity: 2 },
			repulse: { distance: 200, duration: 0.4 },
			connect: { distance: 400, links: { opacity: 0.5 }, radius: 150 }
		}
	},
	particles: {
		move: {
			attract: { enable: false, rotateX: 600, rotateY: 1200 },
			bounce: true,
			enable: true,
			out_mode: 'out',
			random: false,
			speed: 1,
			straight: false
		},
		rotate: {
			animation: {
				enable: false,
				speed: 10,
				sync: false
			}
		},
		number: { density: { enable: true, area: 800 }, value: 20 },
		opacity: {
			animation: { enable: true, speed: 0.5, sync: false },
			random: false,
			value: { min: 0.1, max: 0.8 }
		},
		links: {
			blink: false,
			distance: 400,
			enable: true,
			frequency: 1,
			opacity: 0.2,
			width: 1,
			warp: false
		}
	},
	detectRetina: true
};

/**
 * Create a financial-themed particle configuration for the main background
 * Features dynamic percentage text particles in green and red
 * 
 * IMPLEMENTATION NOTE: This function intentionally uses baseConfig.particles.links
 * (distance: 400, opacity: 0.2, no color property) to match the original 
 * Background.svelte behavior where duplicate links definitions caused the 
 * second one to override the first.
 * 
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Complete particle configuration
 */
export const createFinancialParticleConfig = (overrides = {}) => {
	const config = {
		...baseConfig,
		particles: {
			...baseConfig.particles,
			move: {
				...baseConfig.particles.move,
				direction: 'top'
			},
			shape: {
				type: 'text',
				options: {
					text: [
						{
							fill: true,
							font: 'Verdana',
							value: generatePercentageValues(50, true), // Positive percentages
							weight: '400',
							particles: {
								color: '#00FF9E', // Green for positive
								size: { value: 8 }
							}
						},
						{
							fill: true,
							font: 'Verdana',
							value: generatePercentageValues(50, false), // Negative percentages
							weight: '400',
							particles: {
								color: '#FF0061', // Red for negative
								size: { value: 8 }
							}
						}
					]
				}
			}
			// Note: Using baseConfig.particles.links (distance: 400, opacity: 0.2)
			// This matches the original Background.svelte effective behavior where
			// the second links definition overwrote the first one
		}
	};

	// Deep merge overrides
	return deepMerge(config, overrides);
};

/**
 * Create an error page particle configuration
 * Features "404" and "ERROR" text particles
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Complete particle configuration
 */
export const createErrorParticleConfig = (overrides = {}) => {
	const config = {
		...baseConfig,
		particles: {
			...baseConfig.particles,
			links: {
				color: '#22c55e',
				distance: 150,
				enable: true,
				opacity: 0.3,
				width: 1
			},
			move: {
				...baseConfig.particles.move,
				direction: 'none'
			},
			number: { density: { enable: true, area: 800 }, value: 15 },
			opacity: {
				animation: { enable: true, speed: 0.5, sync: false },
				random: false,
				value: { min: 0.3, max: 0.8 }
			},
			shape: {
				type: 'text',
				options: {
					text: [
						{
							fill: true,
							font: 'Verdana',
							value: ['404', '404', '404'],
							weight: '400',
							particles: {
								color: '#22c55e', // Green
								size: { value: 12 }
							}
						},
						{
							fill: true,
							font: 'Verdana',
							value: ['ERROR', 'ERROR'],
							weight: '400',
							particles: {
								color: '#FF0061', // Red
								size: { value: 12 }
							}
						}
					]
				}
			}
		}
	};

	// Deep merge overrides
	return deepMerge(config, overrides);
};

/**
 * Deep merge utility function for configuration objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
	const result = { ...target };
	
	for (const key in source) {
		if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
			result[key] = deepMerge(result[key] || {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}
	
	return result;
}

/*
 * EXAMPLE: Creating custom particle configurations
 * 
 * To add new particle effects, follow this pattern:
 * 
 * export const createCustomParticleConfig = (overrides = {}) => {
 *   const config = {
 *     ...baseConfig,
 *     particles: {
 *       ...baseConfig.particles,
 *       // Custom particle settings
 *       shape: {
 *         type: 'circle', // or 'text', 'star', etc.
 *         options: { ... }
 *       },
 *       color: { value: '#custom-color' },
 *       move: {
 *         ...baseConfig.particles.move,
 *         direction: 'custom-direction'
 *       }
 *     }
 *   };
 *   
 *   return deepMerge(config, overrides);
 * };
 * 
 * SECURITY NOTE: This module uses crypto.getRandomValues() for all random number
 * generation. If you create custom particle configs that need randomness, consider
 * using the same approach for consistency and security best practices.
 */