import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LlamaService } from '../src/lib/server/ccbilling-llama-service.js';

// Mock the environment variables
vi.mock('$env/static/private', () => ({
	LLAMA_API_KEY: 'test-api-key'
}));

// Mock the llama-api-client
vi.mock('llama-api-client', () => {
	const mockChatCompletions = {
		create: vi.fn()
	};
	
	const mockLlamaAPIClient = vi.fn().mockReturnValue({
		chat: {
			completions: mockChatCompletions
		}
	});
	
	return {
		default: mockLlamaAPIClient
	};
});

describe('LlamaService', () => {
	let llamaService;
	let mockResponse;
	let mockChatCompletions;
	let mockLlamaAPIClient;

	beforeEach(async () => {
		vi.clearAllMocks();
		
		// Reset environment
		process.env.LLAMA_API_KEY = 'test-api-key';
		
		// Create mock response structure
		mockResponse = {
			completion_message: {
				content: {
					text: ''
				}
			}
		};
		
		// Get the mocked functions
		const llamaAPIClientModule = await import('llama-api-client');
		mockLlamaAPIClient = llamaAPIClientModule.default;
		mockChatCompletions = mockLlamaAPIClient().chat.completions;
		mockChatCompletions.create.mockResolvedValue(mockResponse);
	});

	afterEach(() => {
		delete process.env.LLAMA_API_KEY;
	});

	describe('constructor', () => {
		it('should initialize with API key from environment', () => {
			llamaService = new LlamaService();
			
			expect(llamaService.apiKey).toBe('test-api-key');
			expect(mockLlamaAPIClient).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				timeout: 30000,
				logLevel: 'warn'
			});
		});
	});

	describe('parseStatement', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should throw error for invalid statement text', async () => {
			await expect(llamaService.parseStatement(null)).rejects.toThrow('Invalid statement text provided');
			await expect(llamaService.parseStatement(undefined)).rejects.toThrow('Invalid statement text provided');
			await expect(llamaService.parseStatement(123)).rejects.toThrow('Invalid statement text provided');
		});

		it('should parse valid statement and return charges', async () => {
			const mockCharges = [
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' },
				{ merchant: 'Shell', amount: 32.50, date: '2024-01-16' }
			];

			mockResponse.completion_message.content.text = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Sample statement text');

			expect(mockChatCompletions.create).toHaveBeenCalledWith({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content: 'You are a helpful assistant that parses credit card statements and extracts charge information. Always return only valid JSON arrays without any markdown formatting or code blocks.'
					},
					{
						role: 'user',
						content: expect.stringContaining('Parse the following credit card statement')
					}
				],
				temperature: 0.1,
				max_tokens: 2000
			});

			expect(result).toEqual([
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15', allocated_to: 'Both' },
				{ merchant: 'Shell', amount: 32.50, date: '2024-01-16', allocated_to: 'Both' }
			]);
		});

		it('should handle JSON wrapped in code blocks', async () => {
			const mockCharges = [{ merchant: 'Test', amount: 10.00, date: '2024-01-01' }];
			
			mockResponse.completion_message.content.text = '```json\n' + JSON.stringify(mockCharges) + '\n```';

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Test', amount: 10.00, date: '2024-01-01', allocated_to: 'Both' }
			]);
		});

		it('should handle empty response and throw error', async () => {
			mockResponse.completion_message.content.text = '';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow('No content received from Llama API');
		});

		it('should handle invalid JSON response', async () => {
			mockResponse.completion_message.content.text = 'invalid json';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow('Llama API parsing failed');
		});

		it('should handle non-array response', async () => {
			mockResponse.completion_message.content.text = '{"not": "an array"}';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow('Llama API did not return a valid array');
		});

		it('should filter out invalid charge objects', async () => {
			const mockCharges = [
				{ merchant: 'Valid', amount: 10.00, date: '2024-01-01' },
				null,
				{ invalid: 'object' },
				{ merchant: 'Another Valid', amount: 20.00, date: '2024-01-02' }
			];

			mockResponse.completion_message.content.text = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Valid', amount: 10.00, date: '2024-01-01', allocated_to: 'Both' },
				{ merchant: 'Unknown Merchant', amount: 0, date: null, allocated_to: 'Both' },
				{ merchant: 'Another Valid', amount: 20.00, date: '2024-01-02', allocated_to: 'Both' }
			]);
		});

		it('should provide defaults for missing charge properties', async () => {
			const mockCharges = [
				{ amount: 10.00 },
				{ merchant: 'Test' },
				{ date: '2024-01-01' }
			];

			mockResponse.completion_message.content.text = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Unknown Merchant', amount: 10.00, date: null, allocated_to: 'Both' },
				{ merchant: 'Test', amount: 0, date: null, allocated_to: 'Both' },
				{ merchant: 'Unknown Merchant', amount: 0, date: '2024-01-01', allocated_to: 'Both' }
			]);
		});
	});

	describe('classifyMerchant', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should return default classification for invalid merchant name', async () => {
			const result = await llamaService.classifyMerchant(null);
			
			expect(result).toEqual({
				category: 'Unknown',
				subcategory: 'Unknown',
				website: null,
				description: null,
				confidence: 0
			});
		});

		it('should classify merchant successfully', async () => {
			const mockClassification = {
				category: 'Retail',
				subcategory: 'Grocery Store',
				website: 'https://walmart.com',
				description: 'Large retail chain',
				confidence: 0.9
			};

			mockResponse.completion_message.content.text = JSON.stringify(mockClassification);

			const result = await llamaService.classifyMerchant('Walmart');

			expect(mockChatCompletions.create).toHaveBeenCalledWith({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content: 'You are a helpful assistant that classifies merchants and provides additional information. Always return only valid JSON without any markdown formatting or code blocks.'
					},
					{
						role: 'user',
						content: expect.stringContaining('Classify the following merchant')
					}
				],
				temperature: 0.1,
				max_tokens: 500
			});

			expect(result).toEqual(mockClassification);
		});

		it('should handle API errors gracefully', async () => {
			mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

			const result = await llamaService.classifyMerchant('Walmart');

			expect(result).toEqual({
				category: 'Unknown',
				subcategory: 'Unknown',
				website: null,
				description: null,
				confidence: 0
			});
		});

		it('should provide defaults for missing classification properties', async () => {
			const mockClassification = {
				category: 'Retail'
				// Missing other properties
			};

			mockResponse.completion_message.content.text = JSON.stringify(mockClassification);

			const result = await llamaService.classifyMerchant('Walmart');

			expect(result).toEqual({
				category: 'Retail',
				subcategory: 'Unknown',
				website: null,
				description: null,
				confidence: 0
			});
		});

		it('should clamp confidence value between 0 and 1', async () => {
			const mockClassification = {
				category: 'Retail',
				subcategory: 'Store',
				website: null,
				description: null,
				confidence: 1.5 // Invalid confidence
			};

			mockResponse.completion_message.content.text = JSON.stringify(mockClassification);

			const result = await llamaService.classifyMerchant('Walmart');

			expect(result.confidence).toBe(1);
		});
	});

	describe('classifyMerchants', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should return empty array for invalid input', async () => {
			const result = await llamaService.classifyMerchants(null);
			expect(result).toEqual([]);

			const result2 = await llamaService.classifyMerchants([]);
			expect(result2).toEqual([]);
		});

		it('should classify multiple merchants successfully', async () => {
			const mockClassification1 = {
				category: 'Retail',
				subcategory: 'Grocery Store',
				website: 'https://walmart.com',
				description: 'Large retail chain',
				confidence: 0.9
			};

			const mockClassification2 = {
				category: 'Transportation',
				subcategory: 'Gas Station',
				website: 'https://shell.com',
				description: 'Fuel station',
				confidence: 0.8
			};

			mockResponse.completion_message.content.text = JSON.stringify(mockClassification1);
			mockChatCompletions.create
				.mockResolvedValueOnce({ completion_message: { content: { text: JSON.stringify(mockClassification1) } } })
				.mockResolvedValueOnce({ completion_message: { content: { text: JSON.stringify(mockClassification2) } } });

			const result = await llamaService.classifyMerchants(['Walmart', 'Shell']);

			expect(result).toEqual([
				{
					merchant: 'Walmart',
					...mockClassification1
				},
				{
					merchant: 'Shell',
					...mockClassification2
				}
			]);
		});

		it('should handle individual merchant classification failures', async () => {
			mockChatCompletions.create
				.mockResolvedValueOnce({ completion_message: { content: { text: JSON.stringify({ category: 'Retail' }) } } })
				.mockRejectedValueOnce(new Error('API Error'));

			const result = await llamaService.classifyMerchants(['Walmart', 'Shell']);

			expect(result).toEqual([
				{
					merchant: 'Walmart',
					category: 'Retail',
					subcategory: 'Unknown',
					website: null,
					description: null,
					confidence: 0
				},
				{
					merchant: 'Shell',
					category: 'Unknown',
					subcategory: 'Unknown',
					website: null,
					description: null,
					confidence: 0
				}
			]);
		});
	});

	describe('getMerchantInsights', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should return default insights for empty charges', async () => {
			const result = await llamaService.getMerchantInsights([]);

			expect(result).toEqual({
				topCategories: [],
				spendingPatterns: [],
				suggestions: []
			});
		});

		it('should return default insights for null charges', async () => {
			const result = await llamaService.getMerchantInsights(null);

			expect(result).toEqual({
				topCategories: [],
				spendingPatterns: [],
				suggestions: []
			});
		});

		it('should analyze spending patterns and generate insights', async () => {
			const charges = [
				{ merchant: 'Walmart', amount: 100.00 },
				{ merchant: 'Shell', amount: 50.00 },
				{ merchant: 'Walmart', amount: 75.00 }
			];

			const mockClassification1 = {
				category: 'Retail',
				subcategory: 'Grocery Store',
				website: 'https://walmart.com',
				description: 'Large retail chain',
				confidence: 0.9
			};

			const mockClassification2 = {
				category: 'Transportation',
				subcategory: 'Gas Station',
				website: 'https://shell.com',
				description: 'Fuel station',
				confidence: 0.8
			};

			mockChatCompletions.create
				.mockResolvedValueOnce({ completion_message: { content: { text: JSON.stringify(mockClassification1) } } })
				.mockResolvedValueOnce({ completion_message: { content: { text: JSON.stringify(mockClassification2) } } });

			const result = await llamaService.getMerchantInsights(charges);

			expect(result.topCategories).toEqual([
				{ category: 'Retail', total: 175.00 },
				{ category: 'Transportation', total: 50.00 }
			]);

			expect(result.topSubcategories).toEqual([
				{ subcategory: 'Grocery Store', total: 175.00 },
				{ subcategory: 'Gas Station', total: 50.00 }
			]);

			expect(result.merchantClassifications).toHaveProperty('Walmart');
			expect(result.merchantClassifications).toHaveProperty('Shell');
		});
	});

	describe('generateSuggestions', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should generate high spending suggestion when category exceeds 30%', () => {
			const topCategories = [
				{ category: 'Retail', total: 400.00 },
				{ category: 'Transportation', total: 100.00 }
			];

			const charges = [
				{ amount: 400.00 },
				{ amount: 100.00 }
			];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toContainEqual({
				type: 'high_spending',
				category: 'Retail',
				percentage: 80,
				message: 'Retail represents 80% of your spending. Consider setting a budget for this category.'
			});
		});

		it('should generate dining insight when dining spending exceeds 20%', () => {
			const topCategories = [
				{ category: 'Dining', total: 300.00 },
				{ category: 'Transportation', total: 100.00 }
			];

			const charges = [
				{ amount: 300.00 },
				{ amount: 100.00 }
			];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toContainEqual({
				type: 'dining_insight',
				percentage: 75,
				message: 'Dining represents 75% of your spending. Consider meal planning to reduce costs.'
			});
		});

		it('should return empty array when no suggestions apply', () => {
			const topCategories = [
				{ category: 'Transportation', total: 15.00 },
				{ category: 'Entertainment', total: 35.00 }
			];

			const charges = [
				{ amount: 15.00 },
				{ amount: 35.00 }
			];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toEqual([]);
		});
	});
});