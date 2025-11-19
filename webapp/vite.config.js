import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

// Get git info at build time
function getGitInfo() {
	try {
		// eslint-disable-next-line sonarjs/no-os-command-from-path
		const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
		// eslint-disable-next-line sonarjs/no-os-command-from-path
		const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
		const buildTime = new Date().toISOString();
		return { commitHash, branchName, buildTime };
	} catch (error) {
		console.warn('Could not get git info:', error.message);
		return { commitHash: 'unknown', branchName: 'unknown', buildTime: new Date().toISOString() };
	}
}

const gitInfo = getGitInfo();

export default defineConfig(({ command, mode }) => {
	const isDevelopment = command === 'serve' && mode === 'development';
	const plugins = [
		tailwindcss(),
		{ ...threeMinifier(), enforce: /** @type {"pre"} */ ('pre') },
		sveltekit(),
		svelteTesting(),
		imagetools({
			defaultDirectives: isDevelopment
				? new URLSearchParams(`?width=480&format=webp`) // Faster for dev
				: new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
		})
	];

	// Cloudflare plugin doesn't work for production builds. It also is only needed for development to access D1, KV, etc...
	if (isDevelopment) {
		plugins.push(...cloudflare());
	}
	return {
		plugins,
		logLevel: 'info',
		server: {
			host: 'localhost',
			warmup: {
				clientFiles: [
					'./src/routes/+page.svelte',
					'./src/lib/components/**/*.svelte'
					// Add other frequently accessed files/patterns
				]
			}
		},
		test: {
			include: [
				'src/**/*.{test,spec}.{js,ts}',
				'tests/client/**/*.{test,spec}.{js,ts}',
				'tests/server/**/*.{test,spec}.{js,ts}',
				'tests/utils/**/*.{test,spec}.{js,ts}',
				'tests/services/**/*.{test,spec}.{js,ts}'
			],
			globals: true,
			environment: 'jsdom',
			// Add explicit setup and teardown to prevent race conditions
			setupFiles: ['src/test-setup.js'], // Remove global setup file
			teardownTimeout: 10_000, // 10 seconds for cleanup
			// Configure for Svelte 5
			environmentOptions: {
				jsdom: {
					resources: 'usable'
				}
			},
			coverage: {
				reporter: ['text', 'lcov'],
				// Simplify coverage configuration for better CI stability
				exclude: [
					'node_modules/**',
					'tests/**',
					'**/*.test.{js,ts}',
					'**/*.spec.{js,ts}',
					'**/*.config.{js,ts}',
					'**/*.setup.{js,ts}',
					'**/*.stories.{js,ts}'
				],
				// Include all source files
				include: ['src/**/*.{js,ts}']
			},
			server: {},
			// Add timeout and memory optimizations
			testTimeout: 30_000,
			hookTimeout: 30_000,
			// Pool options for test execution
			pool: 'threads', // Change to threads
			poolOptions: {
				threads: {
					// Can add thread-specific options here if needed
				}
			},
			// Configure for Svelte 5 runes
			define: {
				'import.meta.vitest': 'undefined'
			},
			// Add explicit reporter configuration for both console and JUnit output
			reporter: ['default', 'junit'],
			outputFile: {
				junit: './reports/junit.xml'
			},
			transformMode: {
				ssr: {
					exclude: ['/src/lib/utils/file-generator.js/'] // Exclude file-generator.js from SSR transformation
				}
			}
		},
		ssr: {
			noExternal: ['three']
		},
		assetsInclude: ['**/*.glb', '**/*.fbx', '**/*.worker.min.mjs'],
		build: {
			sourcemap: true
		},
		css: {
			devSourcemap: true
		},
		optimizeDeps: {
			exclude: ['saos']
		},
		define: {
			__GIT_COMMIT__: JSON.stringify(gitInfo.commitHash),
			__GIT_BRANCH__: JSON.stringify(gitInfo.branchName),
			__BUILD_TIME__: JSON.stringify(gitInfo.buildTime)
		}
	};
});
