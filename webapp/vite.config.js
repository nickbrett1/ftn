import { sveltekit } from '@sveltejs/kit/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';

export default defineConfig({
	plugins: [
		{ ...threeMinifier(), enforce: 'pre' },
		sveltekit(),
		imagetools({
			defaultDirectives: () => new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
		}),
		SvelteKitPWA({
			manifest: {
				name: 'Fintech Nick',
				icons: [
					{ src: '/icon-192.png', type: 'image/png', sizes: '192x192' },
					{ src: '/icon-512.png', type: 'image/png', sizes: '512x512' },
					{
						src: '/icon-192-maskable.png',
						type: 'image/png',
						sizes: '192x192',
						purpose: 'maskable'
					},
					{
						src: '/icon-512-maskable.png',
						type: 'image/png',
						sizes: '512x512',
						purpose: 'maskable'
					}
				],
				theme_color: '#FFFFFF',
				display: 'standalone',
				background_color: '#FFFFFF',
				start_url: '/'
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		coverage: {
			reporter: ['text', 'lcov']
		}
	},
	ssr: {
		noExternal: ['three']
	},
	assetsInclude: ['**/*.glb', '**/*.fbx'],
	build: {
		sourcemap: 'hidden'
	}
});
