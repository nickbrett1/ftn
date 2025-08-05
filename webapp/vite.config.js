import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
	const isDev = command === 'serve' && mode === 'development';
	const plugins = [
		tailwindcss(),
		{ ...threeMinifier(), enforce: /** @type {"pre"} */ ('pre') },
		sveltekit(),
		svelteTesting(),
		imagetools({
			defaultDirectives: isDev
				? new URLSearchParams(`?width=480&format=webp`) // Faster for dev
				: new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
		})
	];

	// Cloudflare plugin doesn't work for production builds. It also is only needed for development to access D1, KV, etc...
	if (isDev) {
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
			include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
			globals: true,
			environment: 'jsdom',
			coverage: {
				reporter: ['text', 'lcov'],
				// Reduce memory usage by limiting coverage collection
				exclude: [
					'node_modules/**',
					'tests/**',
					'**/*.test.{js,ts}',
					'**/*.spec.{js,ts}',
					'**/*.config.{js,ts}',
					'**/*.setup.{js,ts}'
				],
				// Limit coverage to essential files
				include: [
					'src/**/*.{js,ts}'
				]
			},
			server: {},
			// Add timeout and memory optimizations
			testTimeout: 30000,
			hookTimeout: 30000,
			// Limit concurrent tests to reduce memory usage
			maxConcurrency: 2,
			// Reduce memory usage
			pool: 'forks',
			poolOptions: {
				forks: {
					singleFork: true
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
		}
	};
});
