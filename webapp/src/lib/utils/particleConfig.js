/**
 * Particle configuration utilities for tsParticles
 * Provides reusable, configurable particle effects for the application
 */

/**
 * Generate random percentage values for financial-themed particles
 * @param {number} count - Number of values to generate
 * @param {boolean} positive - Whether to generate positive (+) or negative (-) values
 * @returns {string[]} Array of formatted percentage strings
 */
export const generatePercentageValues = (count = 50, positive = true) => {
	return Array.from(
		{ length: count },
		() => (positive ? '+' : '-') + Math.round(Math.random() * 15 * 100) / 100 + '%'
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
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Complete particle configuration
 */
export const createFinancialParticleConfig = (overrides = {}) => {
	const config = {
		...baseConfig,
		particles: {
			...baseConfig.particles,
			links: {
				color: 'random',
				distance: 150,
				enable: true,
				opacity: 0.4,
				width: 1
			},
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
			},
			links: {
				...baseConfig.particles.links,
				color: 'random',
				distance: 150,
				opacity: 0.4
			}
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
 */