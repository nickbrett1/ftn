import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';

export default defineConfig({
	plugins: [
		{ ...threeMinifier(), enforce: 'pre' },
		sveltekit(),
		svelteTesting(),
		imagetools({
			defaultDirectives: () => new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
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
		sourcemap: true
	},
	css: {
		devSourcemap: true
	},
	server: {
		host: '127.0.0.1',
		allowedHosts: ['mac-studio.local'],
		port: 5173
	},
	optimizeDeps: {
		exclude: ['saos']
	}
});
