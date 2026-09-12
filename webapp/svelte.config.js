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

/**
 * Mermaid renders multi-line node labels with `<br>` tags inside the HTML of its
 * `<foreignObject>` elements. Everything inside an `<svg>` is serialized in the SVG
 * namespace, where `br` is not a void element, so the HTML serializer emits `<br></br>`.
 * The Svelte compiler rejects that ("Void elements cannot have children or closing tags"),
 * which breaks the build. Swap those elements for a raw `<br/>` node so the emitted markup
 * is the valid void tag the label needs.
 */
function rehypeMermaidLineBreaks() {
	const fix = (node, inSvg) => {
		if (!node || !Array.isArray(node.children)) return node;
		const svg = inSvg || (node.type === 'element' && node.tagName === 'svg');
		return {
			...node,
			children: node.children.map((child) =>
				svg && child.type === 'element' && child.tagName === 'br'
					? { type: 'raw', value: '<br/>' }
					: fix(child, svg)
			)
		};
	};
	return (tree) => fix(tree, false);
}

const isTest = process.env.VITEST === 'true';

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
					'https://www.gstatic.com',
					'https://ftn-preview.nick-brett1.workers.dev',
					'https://ftn-production.nick-brett1.workers.dev',
					'https://agent-swarm.nick-brett1.workers.dev',
					'wss://agent-swarm.nick-brett1.workers.dev'
				],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'frame-src': ['self', 'https://accounts.google.com/gsi/'],
				'img-src': [
					'self',
					'data:',
					'blob:',
					'https://img.icons8.com',
					'https://upload.wikimedia.org',
					'https://images.unsplash.com'
				],
				'manifest-src': ['self'],
				'media-src': ['self', 'https://ssl.gstatic.com'],
				'object-src': ['none'],

				// NOTE: This `unsafe-hashes` with this specific hash (`sha256-7dQ...`) is
				// necessary to prevent the CSP policy from causing issues with inlined
				// image event handlers.
				// See https://github.com/sveltejs/svelte/issues/14014
				// NOTE: `unsafe-eval` is required for WebAssembly compilation in Threlte/Three.js 3D components
				'script-src': [
					'self',
					'https://static.cloudflareinsights.com',
					'https://*.ingest.sentry.io',
					'https://sentry.io/api/',
					'https://accounts.google.com/gsi/client',
					'ajax.cloudflare.com',
					'strict-dynamic',
					'unsafe-hashes',
					'unsafe-eval',
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
			rehypePlugins: isTest
				? []
				: [[rehypeMermaid, { strategy: 'inline-svg' }], rehypeMermaidLineBreaks],
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
