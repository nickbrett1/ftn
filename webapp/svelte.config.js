import { preprocessMeltUI, sequence } from '@melt-ui/pp';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltePreprocess } from 'svelte-preprocess';
/** @type {import('@sveltejs/kit').Config}*/
const config = {
	kit: {
		adapter: adapter(),
		csp: {
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
				'img-src': ['self', 'data:', 'blob:', 'https://img.icons8.com'],
				'manifest-src': ['self'],
				'media-src': ['self', 'https://ssl.gstatic.com'],
				'object-src': ['none'],
				'script-src': [
					'self',
					'https://static.cloudflareinsights.com',
					'https://*.ingest.sentry.io',
					'https://sentry.io/api/',
					'https://accounts.google.com/gsi/client',
					'ajax.cloudflare.com',
					'strict-dynamic',
					'unsafe-eval'
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
