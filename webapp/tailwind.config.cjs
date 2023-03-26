/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			keyframes: {
				example: {
					from: { 'background-color': 'red' },
					to: { 'background-color': 'blue' }
				}
			}
		},
		animation: {
			example: 'example 1s ease-in-out infinite'
		}
	},
	plugins: []
};
