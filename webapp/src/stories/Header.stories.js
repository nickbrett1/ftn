import Header from './Header.svelte';

export default {
	title: 'Example/Header',
	component: Header,
	// This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/7.0/svelte/writing-docs/docs-page
	tags: ['autodocs'],
	parameters: {
		// More on how to position stories at: https://storybook.js.org/docs/7.0/svelte/configure/story-layout
		layout: 'fullscreen'
	}
};

export const LoggedIn = {
	args: {
		user: {
			name: 'Jane Doe'
		}
	}
};

export const LoggedOut = {};
