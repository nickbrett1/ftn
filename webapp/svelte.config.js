import { preprocessMeltUI, sequence } from '@melt-ui/pp';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltePreprocess } from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeMermaid from 'rehype-mermaid';

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
		preprocessMeltUI(),
		mdsvex({
			extensions: ['.md', '.svx'],
			remarkPlugins: [remarkGfm],
			rehypePlugins: [
				rehypeSlug,
				[rehypeAutolinkHeadings, { behavior: 'wrap' }],
				[rehypeMermaid, { strategy: 'inline-svg' }] // Add rehype-mermaid
			],
			highlight: {
				highlighter: (code, lang) => {
					// Intercept the highlighter for mermaid blocks and return an AST node directly.
					// Further explanation here: https://sunbath.top/playground/integrate-rehype-mermaid-with-mdsvex
					if (lang === 'mermaid') {
						return {
							type: 'element',
							tagName: 'code',
							properties: { className: 'language-mermaid' },
							children: [{ type: 'text', value: code }]
						};
					}
					// Use your chosen highlighter for other languages
					return highlight(code, lang);
				}
			}
		})
	]),
	extensions: ['.svelte', '.md', '.svx'] // Add .md and .svx to Svelte's recognized extensions
};
export default config;
