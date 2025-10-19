import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import security from 'eslint-plugin-security';

export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	{
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2017
			}
		}
	},
	{
		plugins: {
			security
		},
		rules: {
			'security/detect-unsafe-regex': 'error'
		}
	},
	{
		files: ['**/*.test.js', '**/*.spec.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.vitest,
				beforeEach: 'readonly',
				afterAll: 'readonly',
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
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
			'**/contracts/api.yaml'
		]
	}
];
