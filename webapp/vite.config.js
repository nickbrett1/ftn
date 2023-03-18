import { sveltekit } from '@sveltejs/kit/vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { defineConfig } from 'vitest/config';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		imagetools(),
		sentryVitePlugin({
			include: '.',
			ignore: ['node_modules', 'vite.config.ts'],
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN
		}),
		SvelteKitPWA({
			manifest: {
				name: 'British Empire Management',
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
			},
			workbox: {
				// Only precache these files - html should be excluded
				globPatterns: ['**/*.{js,css}']
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
	}
});
