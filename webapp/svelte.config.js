import { preprocessMeltUI, sequence } from '@melt-ui/pp';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltePreprocess } from 'svelte-preprocess';
/** @type {import('@sveltejs/kit').Config}*/
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'base-uri': ['none'],
				'connect-src': [
					'self',
					'blob:',
					'https://*.ingest.sentry.io',
					'https://sentry.io/',
					'https://fonts.googleapis.com',
					'https://fonts.gstatic.com',
					'https://cloudflareinsights.com',
					'https://static.cloudflareinsights.com',
					'https://accounts.google.com/gsi/',
					'https://www.gstatic.com'
				],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'frame-src': ['self', 'https://accounts.google.com/gsi/'],
				'img-src': [
					'self',
					'data:',
					'blob:',
					'https://img.icons8.com',
					'https://upload.wikimedia.org'
				],
				'manifest-src': ['self'],
				'media-src': ['self', 'https://ssl.gstatic.com'],
				'object-src': ['none'],

				// NOTE: This `unsafe-hashes` with this specific hash (`sha256-7dQ...`) is
				// necessary to prevent the CSP policy from causing issues with inlined
				// image event handlers.
				// See https://github.com/sveltejs/svelte/issues/14014
				'script-src': [
					'self',
					'https://static.cloudflareinsights.com',
					'https://*.ingest.sentry.io',
					'https://sentry.io/api/',
					'https://accounts.google.com/gsi/client',
					'ajax.cloudflare.com',
					'strict-dynamic',
					'unsafe-eval',
					'unsafe-hashes',
					'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I='
				],
				'worker-src': ['self', 'blob:']
			}
		}
	},
	compilerOptions: {
		enableSourcemap: true
	},
	preprocess: sequence([
		sveltePreprocess({
			sourceMap: true
		}),
		preprocessMeltUI()
	])
};
export default config;
