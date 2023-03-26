import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			directives: {
				'base-uri': ['none'],
				'connect-src': [
					'self',
					'https://*.ingest.sentry.io',
					'https://sentry.io/',
					'https://fonts.googleapis.com',
					'https://fonts.gstatic.com',
					'https://cloudflareinsights.com',
					'https://static.cloudflareinsights.com',
					'https://accounts.google.com/gsi/'
				],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'frame-src': ['self', 'https://accounts.google.com/gsi/'],
				'img-src': ['self', 'data:'],
				'manifest-src': ['self'],
				'media-src': ['self', 'https://ssl.gstatic.com'],
				'object-src': ['none'],
				'script-src': [
					'self',
					'https://fintechnick.com/cdn-cgi/scripts/5c5dd728/cloudflare-static/',
					'https://static.cloudflareinsights.com',
					'https://*.ingest.sentry.io',
					'https://sentry.io/api/',
					'https://accounts.google.com/gsi/client',
					'ajax.cloudflare.com',
					'unsafe-inline',
					'strict-dynamic'
				],
				'worker-src': ['self']
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;
