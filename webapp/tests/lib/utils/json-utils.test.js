/**
 * @fileoverview Tests for JSON utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDevcontainerConfig } from '../../../src/lib/utils/json-utils.js';

describe('JSON Utils', () => {
	describe('parseDevcontainerConfig', () => {
		let errorSpy;

		beforeEach(() => {
			// Spy on console.error before each test
			errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			// Restore original console.error after each test
			errorSpy.mockRestore();
		});
		it('should parse a valid JSON string without comments', () => {
			const jsonString = '{"key": "value", "number": 123}';
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({ key: 'value', number: 123 });
		});

		it('should parse a valid JSON object', () => {
			const jsonObject = { key: 'value', number: 123 };
			const result = parseDevcontainerConfig(jsonObject, 'test');
			expect(result).toEqual({ key: 'value', number: 123 });
		});

		it('should strip single-line comments', () => {
			const jsonString = `{
				// This is a comment
				"key": "value", // Another comment
				"number": 123
			}`;
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({ key: 'value', number: 123 });
		});

		it('should strip block comments', () => {
			const jsonString = `{
				/* This is a
				   multi-line comment */
				"key": "value",
				"number": 123
			}`;
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({ key: 'value', number: 123 });
		});

		it('should handle comments within strings', () => {
			const jsonString = '{"key": "value // not a comment"}';
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({ key: 'value // not a comment' });
		});

		it('should handle escaped quotes in strings', () => {
			const jsonString = String.raw`{"key": "value \"with quotes\""}`;
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({ key: 'value "with quotes"' });
		});

		it('should throw an error for invalid JSON', () => {
			const jsonString = '{"key": "value",}';
			expect(() => parseDevcontainerConfig(jsonString, 'test')).toThrow(
				'Invalid test devcontainer configuration'
			);
		});

		it('should throw an error for invalid input type', () => {
			expect(() => parseDevcontainerConfig(123, 'test')).toThrow(
				'Invalid test devcontainer configuration type'
			);
		});

		it('should handle empty input', () => {
			const jsonString = '';
			expect(() => parseDevcontainerConfig(jsonString, 'test')).toThrow(
				'Invalid test devcontainer configuration'
			);
		});

		it('should handle a complex case with mixed comments and strings', () => {
			const jsonString = `{
				"name": "My Project", // Project name
				"image": "mcr.microsoft.com/devcontainers/universal:2",
				/*
				 * Features to be included
				 */
				"features": {
					"ghcr.io/devcontainers/features/docker-in-docker:2": {
						"version": "latest",
						"moby": true // Use Moby
					}
				},
				"comment_in_string": "This is a string with // a comment-like part"
			}`;
			const result = parseDevcontainerConfig(jsonString, 'test');
			expect(result).toEqual({
				name: 'My Project',
				image: 'mcr.microsoft.com/devcontainers/universal:2',
				features: {
					'ghcr.io/devcontainers/features/docker-in-docker:2': {
						version: 'latest',
						moby: true
					}
				},
				comment_in_string: 'This is a string with // a comment-like part'
			});
		});
	});
});