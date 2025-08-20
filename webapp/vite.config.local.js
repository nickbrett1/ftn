import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		{ ...threeMinifier(), enforce: 'pre' },
		sveltekit(),
		svelteTesting(),
		imagetools({
			defaultDirectives: new URLSearchParams(`?width=480&format=webp`)
		})
	],
	logLevel: 'info',
	server: {
		host: '0.0.0.0',
		port: 5173
	},
	ssr: {
		noExternal: ['three']
	},
	assetsInclude: ['**/*.glb', '**/*.fbx', '**/*.worker.min.mjs']
});