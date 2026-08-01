import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

// Unicorn is intentionally excluded — its 'flat/recommended' config enforces
// hundreds of opinionated style rules far beyond what SonarCloud covers, and
// would block most commits with false positives. SonarJS + security cover the
// important bug-finding and security rules we care about.

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	security.configs.recommended,
	sonarjs.configs.recommended,
	prettier,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2022,
				__GIT_COMMIT__: 'readonly',
				__GIT_BRANCH__: 'readonly',
				__BUILD_TIME__: 'readonly',
				melt: 'readonly'
			}
		}
	},
	{
		files: [
			'**/*.test.js',
			'**/*.spec.js',
			'src/test-setup.js',
			'src/routes/projects/ccbilling/budgets/shared-test-helpers.js'
		],
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
		files: ['**/*'],
		rules: {
			// Svelte specific rules
			'svelte/no-useless-mustaches': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'off',
			'svelte/infinite-reactive-loop': 'off',
			'svelte/prefer-svelte-reactivity': 'off',
			'svelte/prefer-writable-derived': 'off',

			// sonarjs — downgrade noisy rules to warn
			'sonarjs/no-duplicate-string': 'warn',
			'sonarjs/cognitive-complexity': ['warn', 20],
			'sonarjs/no-clear-text-protocols': 'warn', // test files use http://localhost
			// Test-style rules — warn only, don't block commits
			'sonarjs/prefer-specific-assertions': 'warn',
			'sonarjs/no-nested-conditional': 'warn',
			'sonarjs/parameterized-tests': 'warn',
			'sonarjs/no-floating-point-equality': 'warn',
			'sonarjs/assertions-in-tests': 'warn',
			'sonarjs/no-trivial-assertions': 'warn',
			'sonarjs/no-skipped-tests': 'warn',
			'sonarjs/concise-regex': 'warn',
			'sonarjs/super-linear-regex': 'warn',
			// Security rules that generate false positives on scripts
			'sonarjs/no-os-command-from-path': 'warn',
			'sonarjs/publicly-writable-directories': 'warn',
			'sonarjs/file-permissions': 'warn',
			// preserve-caught-error — off, requires rethrow pattern not used here
			'preserve-caught-error': 'off',

			// Pre-existing tech debt — warn so they surface in IDE but don't block commits.
			// These existed before linting was added and need a dedicated cleanup pass.
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'sonarjs/unused-import': 'warn',
			'sonarjs/no-unused-vars': 'warn',
			'sonarjs/no-dead-store': 'warn',
			'sonarjs/no-use-of-empty-return-value': 'warn',
			'no-useless-assignment': 'warn',

			// security — downgrade noisy false-positive rules to warn
			'security/detect-object-injection': 'warn',

			// typescript-eslint — keep most as errors but ease ts-comment rule
			'@typescript-eslint/ban-ts-comment': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn'
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
			'static/pdf.worker.min.mjs',
			'src/lib/server/precompiled-templates.js'
		]
	}
];
