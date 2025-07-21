import { preprocessMeltUI } from '@melt-ui/pp';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltePreprocess } from 'svelte-preprocess';
import { mdsvex, escapeSvelte } from 'mdsvex';
import rehypeMermaid from 'rehype-mermaid';
import { createHighlighter } from 'shiki';
import remarkGfm from 'remark-gfm';
import remarkFootnotes from 'remark-footnotes';

// Initialize Shiki highlighter promise at the top level
const highlighterPromise = createHighlighter({
	themes: ['github-dark'],
	langs: [
		'javascript',
		'svelte',
		'python',
		'json',
		'bash',
		'html',
		'css',
		'markdown',
		'mermaid',
		'ts',
		'sql',
		'yaml',
		'jinja'
	]
});

export async function highlight(code, lang) {
	const highlighter = await highlighterPromise; // Await the single promise
	return escapeSvelte(highlighter.codeToHtml(code, { lang, theme: 'github-dark' }));
}

/** @type {import('@sveltejs/kit').Config}*/
const config = {
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: true
		},
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
	compilerOptions: {},
	preprocess: [
		mdsvex({
			extensions: ['.md', '.svx'],
			remarkPlugins: [remarkFootnotes, remarkGfm],
			rehypePlugins: [[rehypeMermaid, { strategy: 'inline-svg' }]],
			highlight: {
				highlighter: async (code, lang) => {
					// Intercept the highlighter for mermaid blocks and return an AST node directly.
					// Further explanation here: https://sunbath.top/playground/integrate-rehype-mermaid-with-mdsvex
					if (lang === 'mermaid') {
						return {
							type: 'element',
							tagName: 'pre',
							properties: {},
							children: [
								{
									type: 'element',
									tagName: 'code',
									properties: { className: ['language-mermaid'] },
									children: [{ type: 'text', value: code }]
								}
							]
						};
					}
					// Use Shiki for other languages
					return await highlight(code, lang);
				}
			}
		}),
		sveltePreprocess({
			sourceMap: true
		}),
		preprocessMeltUI()
	],
	extensions: ['.svelte', '.md', '.svx'] // Add .md and .svx to Svelte's recognized extensions
};
export default config;
