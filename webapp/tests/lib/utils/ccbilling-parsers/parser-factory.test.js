import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParserFactory } from '../../../../src/lib/utils/ccbilling-parsers/parser-factory.js';

// Mock the parsers
vi.mock('../../../../src/lib/utils/ccbilling-parsers/chase-parser.js', () => ({
	ChaseParser: class MockChaseParser {
		constructor() {
			return {
				providerName: 'Chase',
				canParse: vi.fn(),
				parse: vi.fn()
			};
		}
	}
}));

vi.mock('../../../../src/lib/utils/ccbilling-parsers/wells-fargo-parser.js', () => ({
	WellsFargoParser: class MockWellsFargoParser {
		constructor() {
			return {
				providerName: 'Wells Fargo',
				canParse: vi.fn(),
				parse: vi.fn()
			};
		}
	}
}));

describe('ParserFactory', () => {
	let factory;
	let mockChaseParser;
	let mockWellsFargoParser;

	beforeEach(() => {
		vi.clearAllMocks();
		factory = new ParserFactory();
		mockChaseParser = factory.parsers[0];
		mockWellsFargoParser = factory.parsers[1];
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with Chase and Wells Fargo parsers', () => {
			expect(factory.parsers).toHaveLength(2);
			expect(factory.parsers[0].providerName).toBe('Chase');
			expect(factory.parsers[1].providerName).toBe('Wells Fargo');
		});
	});

	describe('detectParser', () => {
		it('should detect Chase parser for Chase statements', () => {
			mockChaseParser.canParse.mockReturnValue(true);
			const text = 'CHASE ACCOUNT SUMMARY';

			const result = factory.detectParser(text);

			expect(result).toBe(mockChaseParser);
			expect(mockChaseParser.canParse).toHaveBeenCalledWith(text);
		});

		it('should detect Wells Fargo parser for Wells Fargo statements', () => {
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(true);
			const text = 'WELLS FARGO BILT ACCOUNT';

			const result = factory.detectParser(text);

			expect(result).toBe(mockWellsFargoParser);
			expect(mockWellsFargoParser.canParse).toHaveBeenCalledWith(text);
		});

		it('should return null when no parser matches', () => {
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(false);
			const text = 'UNKNOWN STATEMENT FORMAT';

			const result = factory.detectParser(text);

			expect(result).toBeNull();
		});

		it('should log detected parser', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			mockChaseParser.canParse.mockReturnValue(true);
			const text = 'CHASE STATEMENT';

			factory.detectParser(text);

			expect(consoleSpy).toHaveBeenCalledWith('🔍 Detected parser: Chase');
			consoleSpy.mockRestore();
		});

		it('should log warning when no parser found', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(false);
			const text = 'UNKNOWN FORMAT';

			factory.detectParser(text);

			expect(consoleSpy).toHaveBeenCalledWith('⚠️ No parser found for this statement format');
			consoleSpy.mockRestore();
		});
	});

	describe('parseStatement', () => {
		it('should parse statement using detected parser', async () => {
			const mockParsedData = {
				last4: '1234',
				statement_date: '2024-01-15',
				charges: []
			};

			mockChaseParser.canParse.mockReturnValue(true);
			mockChaseParser.parse = vi.fn().mockResolvedValue(mockParsedData);

			const text = 'CHASE STATEMENT';
			const result = await factory.parseStatement(text);

			expect(result).toEqual(mockParsedData);
			expect(mockChaseParser.parse).toHaveBeenCalledWith(text);
		});

		it('should throw error when no parser is available', async () => {
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(false);
			const text = 'UNKNOWN STATEMENT FORMAT';

			await expect(factory.parseStatement(text)).rejects.toThrow(
				'No parser available for this statement format'
			);
		});
	});

	describe('getSupportedProviders', () => {
		it('should return list of supported provider names', () => {
			const providers = factory.getSupportedProviders();

			expect(providers).toEqual(['Chase', 'Wells Fargo']);
		});

		it('should return all provider names when multiple parsers exist', () => {
			// Add a mock parser to test multiple providers
			const mockParser = {
				providerName: 'Amex'
			};
			factory.parsers.push(mockParser);

			const providers = factory.getSupportedProviders();

			expect(providers).toEqual(['Chase', 'Wells Fargo', 'Amex']);
		});
	});

	describe('integration with real parsers', () => {
		it('should return null for non-Chase statements', () => {
			const realFactory = new ParserFactory();

			const nonChaseText = 'AMEX STATEMENT SUMMARY';
			const parser = realFactory.detectParser(nonChaseText);

			expect(parser).toBeNull();
		});
	});

	describe('error handling', () => {
		it('should handle parser errors gracefully', async () => {
			mockChaseParser.canParse.mockReturnValue(true);
			mockChaseParser.parse = vi.fn().mockRejectedValue(new Error('Parser error'));

			const text = 'CHASE STATEMENT';

			await expect(factory.parseStatement(text)).rejects.toThrow('Parser error');
		});

		it('should handle null text input', () => {
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(false);

			const result = factory.detectParser(null);

			expect(result).toBeNull();
		});

		it('should handle empty text input', () => {
			mockChaseParser.canParse.mockReturnValue(false);
			mockWellsFargoParser.canParse.mockReturnValue(false);

			const result = factory.detectParser('');

			expect(result).toBeNull();
		});
	});

	describe('parser registration', () => {
		it('should allow adding new parsers', () => {
			const newParser = {
				providerName: 'NewBank',
				canParse: vi.fn().mockReturnValue(false)
			};

			factory.parsers.push(newParser);

			expect(factory.parsers).toHaveLength(3);
			expect(factory.getSupportedProviders()).toContain('NewBank');
		});

		it('should detect newly added parsers', () => {
			const newParser = {
				providerName: 'NewBank',
				canParse: vi.fn().mockReturnValue(true)
			};

			factory.parsers.push(newParser);

			const text = 'NEWBANK STATEMENT';
			const detectedParser = factory.detectParser(text);

			expect(detectedParser).toBe(newParser);
		});
	});
});
