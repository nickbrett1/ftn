import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended, // Added tseslint recommended configs
	security.configs.recommended, // Apply security plugin recommended rules
	sonarjs.configs.recommended,
	unicorn.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/recommended'], // Svelte recommended configs
	{
		languageOptions: {
			ecmaVersion: 2022, // Support for class properties and top-level await
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2022,
				__GIT_COMMIT__: 'readonly',
				__GIT_BRANCH__: 'readonly',
				__BUILD_TIME__: 'readonly',
				melt: 'readonly' // Add melt as a global
			}
		}
	},
	{
		files: [
			'**/*.test.js',
			'**/*.spec.js',
			'src/routes/projects/ccbilling/budgets/shared-test-helpers.js'
		], // Added shared-test-helpers.js
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.vitest,
				beforeEach: 'readonly',
				afterAll: 'readonly',
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly', // Ensure expect is readonly
				vi: 'readonly'
			}
		}
	},
	{
		files: ['src/service-worker.js'],
		languageOptions: {
			globals: {
				...globals.serviceworker
			}
		}
	},
	{
		files: ['**/ArticleRenderer.svelte'],
		rules: {
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		files: ['**/*'], // Apply to all files
		rules: {
			// Svelte specific rules
			'svelte/no-useless-mustaches': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'off',
			'svelte/infinite-reactive-loop': 'off',
			'svelte/prefer-svelte-reactivity': 'off',
			'svelte/prefer-writable-derived': 'off'
		}
	},
	{
		ignores: [
			'.DS_Store',
			'node_modules/**',
			'build/**',
			'.svelte-kit/**',
			'package/**',
			'.env',
			'.env.*',
			'!.env.example',
			'*.svx',
			'package-lock.json',
			'**/*.stories.js',
			'coverage/**',
			'.wrangler/**',
			'static/pdf.worker.min.mjs'
		]
	}
];
