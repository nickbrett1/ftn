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
			defaultDirectives: new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
		})
	];

	// Cloudflare plugin doesn't work for production builds. It also is only needed for development to access D1, KV, etc...
	if (isDev) {
		plugins.push(...cloudflare());
	}
	return {
		plugins,
		server: {
			host: 'localhost'
		},
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
			globals: true,
			environment: 'jsdom',
			coverage: {
				reporter: ['text', 'lcov']
			},
			server: {}
		},
		ssr: {
			noExternal: ['three']
		},
		assetsInclude: ['**/*.glb', '**/*.fbx'],
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
