<script>
	import { marked } from 'marked';
	import hljs from 'highlight.js/lib/core';
	import sql from 'highlight.js/lib/languages/sql';
	import python from 'highlight.js/lib/languages/python';
	import bash from 'highlight.js/lib/languages/bash';
	import 'highlight.js/styles/atom-one-dark.css'; // Choose a theme you like

	const { articleMarkdown = '' } = $props();

	let renderedHtml = '';

	// Register languages for highlight.js
	hljs.registerLanguage('sql', sql);
	hljs.registerLanguage('python', python);
	hljs.registerLanguage('bash', bash);
	hljs.registerLanguage('sh', bash); // Alias for shell scripts

	const renderer = new marked.Renderer();
	const originalCodeRenderer = renderer.code;

	renderer.code = (code, infostring, escaped) => {
		const lang = (infostring || '').match(/\S*/)[0];
		if (lang === 'mermaid') {
			// This div will be picked up by mermaid.js
			return `<div class="mermaid">${code}</div>`;
		}
		if (hljs.getLanguage(lang)) {
			try {
				const highlightedCode = hljs.highlight(code, {
					language: lang,
					ignoreIllegals: true
				}).value;
				return `<pre class="hljs"><code>${highlightedCode}</code></pre>`;
			} catch (e) {
				console.error('Highlighting error:', e);
			}
		}
		// Fallback for unknown languages or if highlighting fails, using original renderer
		return originalCodeRenderer.call(renderer, code, infostring, escaped);
	};

	marked.setOptions({
		renderer,
		pedantic: false,
		gfm: true,
		breaks: false,
		sanitize: false, // IMPORTANT: Only use with trusted markdown.
		smartLists: true,
		smartypants: false,
		xhtml: false
	});

	$effect(() => {
		renderedHtml = marked.parse(articleMarkdown);
	});
</script>

<div class="prose prose-invert lg:prose-xl max-w-none">
	{@html renderedHtml}
</div>
