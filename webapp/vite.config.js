import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { threeMinifier } from '@yushijinhun/three-minifier-rollup';

export default defineConfig({
	plugins: [
		{ ...threeMinifier(), enforce: 'pre' },
		sveltekit(),
		svelteTesting(),
		imagetools({
			defaultDirectives: () => new URLSearchParams(`?width=480;960;1024;1920&format=avif;webp;jpg`)
		}),
		SvelteKitPWA({
			scope: '/',
			base: '/',
			srcDir: './src',
			strategies: 'generateSW',
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			},
			selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
			workbox: {
				globPatterns: ['client/**/*.{js,css,html,svg,png,jpg,jpeg,webp,avif}'],
				sourcemap: true
			},
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
				start_url: '/',
				scope: '/'
			},
			devOptions: {
				enabled: false,
				type: 'module',
				navigateFallback: '/'
			}
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
