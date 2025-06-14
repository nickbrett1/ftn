// /workspaces/ftn/webapp/tests/mdsvex-footnotes.test.js
// The footnote support is provided by the `remark-footnotes` and `remark-gfm` plugins is fragile
// It relies on v2 of 'remark-footnotes', not any later version.
// This test ensures we don't see a regression in footnote processing

import { describe, it, expect } from 'vitest';
import { mdsvex } from 'mdsvex';
import remarkFootnotes from 'remark-footnotes';
import remarkGfm from 'remark-gfm';

// Create a preprocessor instance similar to your svelte.config.js
const preprocess = mdsvex({
	extensions: ['.svx'],
	remarkPlugins: [remarkFootnotes, remarkGfm]
});

describe('Mdsvex Footnote Processing', () => {
	it('should correctly process Markdown footnotes', async () => {
		const markdownContent = `
Hello world.[^1]

[^1]: This is a footnote.
    `;

		const result = await preprocess.markup({
			content: markdownContent,
			filename: 'test.svx' // Filename required
		});

		// Check for the footnote reference link
		// The exact HTML can vary slightly based on plugins, but this is a common structure.
		// remark-gfm typically creates a link like <a href="#user-content-fn-1"...> or <a href="#fn-1"...>
		// and a sup tag.
		expect(result.code).toMatch(/<sup[^>]*><a[^>]+href="#fn-1"((?!<\/sup>).)*<\/a><\/sup>/);

		// Check for the footnote definition section at the bottom
		// remark-gfm usually wraps footnotes in a <section class="footnotes">
		// and then an <ol> or <ul>.
		// remark-footnotes (v2) might produce a simpler <hr class="footnotes-sep"> and <ol class="footnotes-list">
		expect(result.code).toMatch(/<div class="footnotes">\s*<hr>\s*<ol>/);
		expect(result.code).toMatch(/<li id="fn-1">/);
		expect(result.code).toContain('This is a footnote.');
		expect(result.code).toMatch(/<a href="#fnref-1" class="footnote-backref">↩<\/a>/); // Backlink
	});
});
