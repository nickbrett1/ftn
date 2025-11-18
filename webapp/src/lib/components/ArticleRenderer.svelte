<script>
	import { marked } from 'marked';
	import '$lib/client/marked-config.js';
	import 'highlight.js/styles/atom-one-dark.css'; // Choose a theme you like

	const { articleMarkdown = '' } = $props();

	let renderedHtml = $derived(marked.parse(articleMarkdown));
</script>

<div class="prose prose-invert lg:prose-xl max-w-none">
	{@html renderedHtml}
</div>
