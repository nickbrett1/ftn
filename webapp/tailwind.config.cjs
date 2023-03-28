/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			keyframes: {
				example: {
					from: { opacity: 1 },
					to: { opacity: 0 }
				}
			}
		},
		animation: {
			fromto: 'example 5s ease-in infinite'
		}
	},
	plugins: []
};