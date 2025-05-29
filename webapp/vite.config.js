import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';

export default defineConfig(() => {
	// Define the paths to be ignored by Vite's watcher.
	// SvelteKit's main output directory is typically '.svelte-kit'.
	// Adapters usually write within this directory (e.g., '.svelte-kit/cloudflare').
	const svelteKitOutDir = '.svelte-kit';

	const ignoredPaths = [
		// This glob should cover all subdirectories and files within .svelte-kit
		`${svelteKitOutDir}/**`,

		// Standard ignores
		'**/node_modules/**',
		'**/.git/**',

		// Other potential output/state directories you might want to ignore
		'build/**', // If you have a custom top-level /build folder
		'.wrangler/**', // Wrangler's own state/output directory
		'.cloudflare/**' // Cloudflare's output if it's separate from .wrangler
	];

	return {
		plugins: [
			{ ...threeMinifier(), enforce: 'pre' },
			sveltekit(),
			svelteTesting(),
			imagetools({
				defaultDirectives: () =>
					new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
			})
		],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}'],
			globals: true,
			environment: 'jsdom',
			coverage: {
				reporter: ['text', 'lcov']
			},
			server: {
				deps: {
					inline: ['fauna']
				}
			}
		},
		ssr: {
			noExternal: ['three']
		},
		assetsInclude: ['**/*.glb', '**/*.fbx'],
		build: {
			sourcemap: true,
			// These watch options apply specifically when `vite build --watch` is used.
			watch: {
				ignored: ignoredPaths
			}
		},
		css: {
			devSourcemap: true
		},
		server: {
			host: '127.0.0.1',
			allowedHosts: ['mac-studio.local'],
			port: 5173,
			// These watch options apply when `vite dev` (the dev server) is used.
			// SvelteKit's plugin usually handles this, but being explicit can help ensure consistency.
			watch: {
				ignored: ignoredPaths
			}
		},
		optimizeDeps: {
			exclude: ['saos']
		}
	};
});
