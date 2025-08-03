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

// Mock fetch globally
global.fetch = vi.fn();

// Mock ParsingUtils
vi.mock('../src/lib/utils/parsing-utils.js', () => ({
	ParsingUtils: {
		parseJSONResponse: vi.fn(),
		cleanMerchantName: vi.fn((name) => name),
		parseAmount: vi.fn((amount) => parseFloat(amount) || 0),
		parseDate: vi.fn((date) => date)
	}
}));

describe('LlamaService', () => {
	let llamaService;
	let mockResponse;
	let mockChatCompletions;
	let mockLlamaAPIClient;
	let mockParsingUtils;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Reset environment
		process.env.LLAMA_API_KEY = 'test-api-key';
		process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
		process.env.CLOUDFLARE_BROWSER_RENDERING_API_TOKEN = 'test-api-token';

		// Create mock response structure
		mockResponse = {
			choices: [
				{
					message: {
						content: ''
					}
				}
			]
		};

		// Get the mocked functions
		const llamaAPIClientModule = await import('llama-api-client');
		mockLlamaAPIClient = llamaAPIClientModule.default;
		mockChatCompletions = mockLlamaAPIClient().chat.completions;
		mockChatCompletions.create.mockResolvedValue(mockResponse);

		// Get ParsingUtils mock
		const parsingUtilsModule = await import('../src/lib/utils/parsing-utils.js');
		mockParsingUtils = parsingUtilsModule.ParsingUtils;
		mockParsingUtils.parseJSONResponse.mockImplementation((content) => {
			if (content === 'invalid json') {
				throw new Error('Invalid JSON');
			}
			// Handle markdown code blocks
			if (content.includes('```json')) {
				const match = content.match(/```json\n([\s\S]*?)\n```/);
				if (match) {
					return JSON.parse(match[1]);
				}
			}
			return JSON.parse(content);
		});
		mockParsingUtils.cleanMerchantName.mockImplementation((name) => name);
		mockParsingUtils.parseAmount.mockImplementation((amount) => parseFloat(amount) || 0);
		mockParsingUtils.parseDate.mockImplementation((date) => date || null);
	});

	afterEach(() => {
		delete process.env.LLAMA_API_KEY;
		delete process.env.CLOUDFLARE_ACCOUNT_ID;
		delete process.env.CLOUDFLARE_BROWSER_RENDERING_API_TOKEN;
	});

	describe('constructor', () => {
		it('should initialize with API key from environment', () => {
			llamaService = new LlamaService();

			expect(llamaService.apiKey).toBe('test-api-key');
			expect(mockLlamaAPIClient).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				timeout: 60000,
				logLevel: 'warn'
			});
		});

		it('should initialize with R2 bucket and public URL', () => {
			const mockR2Bucket = { put: vi.fn() };
			const mockR2PublicUrl = 'https://example.com';

			llamaService = new LlamaService(mockR2Bucket, mockR2PublicUrl);

			expect(llamaService.r2).toBe(mockR2Bucket);
			expect(llamaService.r2PublicUrl).toBe(mockR2PublicUrl);
		});
	});

	describe('parseStatement', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should throw error for invalid statement text', async () => {
			await expect(llamaService.parseStatement(null)).rejects.toThrow(
				'Invalid statement text provided'
			);
			await expect(llamaService.parseStatement(undefined)).rejects.toThrow(
				'Invalid statement text provided'
			);
			await expect(llamaService.parseStatement(123)).rejects.toThrow(
				'Invalid statement text provided'
			);
		});

		it('should parse valid statement and return charges', async () => {
			const mockCharges = [
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' },
				{ merchant: 'Shell', amount: 32.5, date: '2024-01-16' }
			];

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Sample statement text');

			expect(mockChatCompletions.create).toHaveBeenCalledWith({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that parses credit card statements and extracts charge information. Always return only valid JSON arrays without any markdown formatting or code blocks.'
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
				{ merchant: 'Shell', amount: 32.5, date: '2024-01-16', allocated_to: 'Both' }
			]);
		});

		it('should handle JSON wrapped in code blocks', async () => {
			const mockCharges = [{ merchant: 'Test', amount: 10.0, date: '2024-01-01' }];

			mockResponse.choices[0].message.content = '```json\n' + JSON.stringify(mockCharges) + '\n```';

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Test', amount: 10.0, date: '2024-01-01', allocated_to: 'Both' }
			]);
		});

		it('should handle empty response and throw error', async () => {
			mockResponse.choices[0].message.content = '';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow(
				'No content received from Llama API'
			);
		});

		it('should handle invalid JSON response', async () => {
			mockResponse.choices[0].message.content = 'invalid json';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow(
				'Llama API parsing failed'
			);
		});

		it('should handle non-array response', async () => {
			mockResponse.choices[0].message.content = '{"not": "an array"}';

			await expect(llamaService.parseStatement('Test statement')).rejects.toThrow(
				'Llama API did not return a valid array'
			);
		});

		it('should filter out invalid charge objects', async () => {
			const mockCharges = [
				{ merchant: 'Valid', amount: 10.0, date: '2024-01-01' },
				null,
				{ invalid: 'object' },
				{ merchant: 'Another Valid', amount: 20.0, date: '2024-01-02' }
			];

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Valid', amount: 10.0, date: '2024-01-01', allocated_to: 'Both' },
				{ merchant: 'Unknown Merchant', amount: 0, date: null, allocated_to: 'Both' },
				{ merchant: 'Another Valid', amount: 20.0, date: '2024-01-02', allocated_to: 'Both' }
			]);
		});

		it('should provide defaults for missing charge properties', async () => {
			const mockCharges = [{ amount: 10.0 }, { merchant: 'Test' }, { date: '2024-01-01' }];

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const result = await llamaService.parseStatement('Test statement');

			expect(result).toEqual([
				{ merchant: 'Unknown Merchant', amount: 10.0, date: null, allocated_to: 'Both' },
				{ merchant: 'Test', amount: 0, date: null, allocated_to: 'Both' },
				{ merchant: 'Unknown Merchant', amount: 0, date: '2024-01-01', allocated_to: 'Both' }
			]);
		});
	});

	describe('convertPdfToImage', () => {
		beforeEach(() => {
			const mockR2Bucket = { put: vi.fn() };
			llamaService = new LlamaService(mockR2Bucket, 'https://example.com');
		});

		it('should convert PDF to image successfully', async () => {
			const mockImageBuffer = Buffer.from('fake-image-data');
			const mockResponse = {
				ok: true,
				headers: new Map([['content-type', 'image/png']]),
				arrayBuffer: vi.fn().mockResolvedValue(mockImageBuffer)
			};

			global.fetch.mockResolvedValue(mockResponse);

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.convertPdfToImage(pdfBuffer, pdfKey);

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.cloudflare.com/client/v4/accounts/test-account-id/browser-rendering/screenshot',
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer test-api-token',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						url: 'https://example.com/test-pdf.pdf'
					})
				}
			);

			expect(result).toEqual({
				imageBuffer: mockImageBuffer,
				imageKey: 'test-pdf.png'
			});
		});

		it('should create mock image when Cloudflare credentials are missing', async () => {
			delete process.env.CLOUDFLARE_ACCOUNT_ID;
			delete process.env.CLOUDFLARE_BROWSER_RENDERING_API_TOKEN;

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.convertPdfToImage(pdfBuffer, pdfKey);

			expect(result).toEqual({
				imageBuffer: expect.any(Buffer),
				imageKey: 'test-pdf.png'
			});
		});

		it('should throw error when R2 bucket is not configured', async () => {
			llamaService = new LlamaService(); // No R2 bucket

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			await expect(llamaService.convertPdfToImage(pdfBuffer, pdfKey)).rejects.toThrow(
				'R2 bucket not configured in LlamaService'
			);
		});

		it('should create mock image when API error response', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				text: vi.fn().mockResolvedValue('API Error')
			};

			global.fetch.mockResolvedValue(mockResponse);

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.convertPdfToImage(pdfBuffer, pdfKey);

			expect(result).toEqual({
				imageBuffer: expect.any(Buffer),
				imageKey: 'test-pdf.png'
			});
		});

		it('should create mock image when non-image response', async () => {
			const mockResponse = {
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				text: vi.fn().mockResolvedValue('{"error": "Not an image"}')
			};

			global.fetch.mockResolvedValue(mockResponse);

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.convertPdfToImage(pdfBuffer, pdfKey);

			expect(result).toEqual({
				imageBuffer: expect.any(Buffer),
				imageKey: 'test-pdf.png'
			});
		});

		it('should create mock image when conversion fails', async () => {
			global.fetch.mockRejectedValue(new Error('Network error'));

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.convertPdfToImage(pdfBuffer, pdfKey);

			expect(result).toEqual({
				imageBuffer: expect.any(Buffer),
				imageKey: 'test-pdf.png'
			});
		});
	});

	describe('parseStatementFromImage', () => {
		beforeEach(() => {
			const mockR2Bucket = { put: vi.fn() };
			llamaService = new LlamaService(mockR2Bucket, 'https://example.com');
		});

		it('should parse statement from image successfully', async () => {
			const mockImageBuffer = Buffer.from('fake-image-data');
			const mockCharges = [
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' }
			];

			// Mock convertPdfToImage
			llamaService.convertPdfToImage = vi.fn().mockResolvedValue({
				imageBuffer: mockImageBuffer,
				imageKey: 'test-pdf.png'
			});

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			const result = await llamaService.parseStatementFromImage(pdfBuffer, pdfKey);

			expect(result).toEqual({
				charges: [
					{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15', allocated_to: 'Both' }
				],
				imageKey: 'test-pdf.png'
			});
		});

		it('should throw error for invalid PDF buffer', async () => {
			await expect(llamaService.parseStatementFromImage(null, 'test-pdf')).rejects.toThrow(
				'Invalid PDF buffer provided'
			);
			await expect(llamaService.parseStatementFromImage('not-a-buffer', 'test-pdf')).rejects.toThrow(
				'Invalid PDF buffer provided'
			);
		});

		it('should throw error for invalid PDF key', async () => {
			const pdfBuffer = Buffer.from('fake-pdf-data');

			await expect(llamaService.parseStatementFromImage(pdfBuffer, null)).rejects.toThrow(
				'PDF key is required for storing files in R2'
			);
			await expect(llamaService.parseStatementFromImage(pdfBuffer, 123)).rejects.toThrow(
				'PDF key is required for storing files in R2'
			);
		});

		it('should handle API error in parseStatementFromImage', async () => {
			llamaService.convertPdfToImage = vi.fn().mockResolvedValue({
				imageBuffer: Buffer.from('fake-image-data'),
				imageKey: 'test-pdf.png'
			});

			mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

			const pdfBuffer = Buffer.from('fake-pdf-data');
			const pdfKey = 'test-pdf';

			await expect(llamaService.parseStatementFromImage(pdfBuffer, pdfKey)).rejects.toThrow(
				'LLAMA image parsing failed: API Error'
			);
		});
	});

	describe('parseImage', () => {
		beforeEach(() => {
			llamaService = new LlamaService();
		});

		it('should parse image successfully', async () => {
			const mockCharges = [
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' }
			];

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const imageBuffer = Buffer.from('fake-image-data');

			const result = await llamaService.parseImage(imageBuffer);

			expect(mockChatCompletions.create).toHaveBeenCalledWith({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a specialized credit card statement parser. Your job is to extract transaction information from statement images with high accuracy. Always return only valid JSON arrays without any markdown formatting or code blocks. Pay close attention to dates, merchant names, and amounts.'
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: expect.stringContaining('You are a credit card statement parser')
							},
							{
								type: 'image_url',
								image_url: {
									url: 'data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh'
								}
							}
						]
					}
				],
				temperature: 0.05,
				max_tokens: 3000
			});

			expect(result).toEqual([
				{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15', allocated_to: 'Both' }
			]);
		});

		it('should throw error for missing image buffer', async () => {
			await expect(llamaService.parseImage(null)).rejects.toThrow(
				'Image buffer required for parsing'
			);
			await expect(llamaService.parseImage(undefined)).rejects.toThrow(
				'Image buffer required for parsing'
			);
		});

		it('should handle API error in parseImage', async () => {
			mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

			const imageBuffer = Buffer.from('fake-image-data');

			await expect(llamaService.parseImage(imageBuffer)).rejects.toThrow(
				'LLAMA image parsing failed: API Error'
			);
		});

		it('should handle empty response from API', async () => {
			mockResponse.choices[0].message.content = '';

			const imageBuffer = Buffer.from('fake-image-data');

			await expect(llamaService.parseImage(imageBuffer)).rejects.toThrow(
				'No content received from Llama API'
			);
		});

		it('should handle non-array response from API', async () => {
			mockResponse.choices[0].message.content = '{"not": "an array"}';

			const imageBuffer = Buffer.from('fake-image-data');

			await expect(llamaService.parseImage(imageBuffer)).rejects.toThrow(
				'Llama API did not return a valid array'
			);
		});

		it('should filter out invalid charge objects', async () => {
			const mockCharges = [
				{ merchant: 'Valid', amount: 10.0, date: '2024-01-01' },
				null,
				{ invalid: 'object' },
				{ merchant: 'Another Valid', amount: 20.0, date: '2024-01-02' }
			];

			mockResponse.choices[0].message.content = JSON.stringify(mockCharges);

			const imageBuffer = Buffer.from('fake-image-data');

			const result = await llamaService.parseImage(imageBuffer);

			expect(result).toEqual([
				{ merchant: 'Valid', amount: 10.0, date: '2024-01-01', allocated_to: 'Both' },
				{ merchant: 'Unknown Merchant', amount: 0, date: null, allocated_to: 'Both' },
				{ merchant: 'Another Valid', amount: 20.0, date: '2024-01-02', allocated_to: 'Both' }
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

			mockResponse.choices[0].message.content = JSON.stringify(mockClassification);

			const result = await llamaService.classifyMerchant('Walmart');

			expect(mockChatCompletions.create).toHaveBeenCalledWith({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that classifies merchants and provides additional information. Always return only valid JSON without any markdown formatting or code blocks.'
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

			mockResponse.choices[0].message.content = JSON.stringify(mockClassification);

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

			mockResponse.choices[0].message.content = JSON.stringify(mockClassification);

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

			mockResponse.choices[0].message.content = JSON.stringify(mockClassification1);
			mockChatCompletions.create
				.mockResolvedValueOnce({
					choices: [{ message: { content: JSON.stringify(mockClassification1) } }]
				})
				.mockResolvedValueOnce({
					choices: [{ message: { content: JSON.stringify(mockClassification2) } }]
				});

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
				.mockResolvedValueOnce({
					choices: [{ message: { content: JSON.stringify({ category: 'Retail' }) } }]
				})
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
				{ merchant: 'Walmart', amount: 100.0 },
				{ merchant: 'Shell', amount: 50.0 },
				{ merchant: 'Walmart', amount: 75.0 }
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
				.mockResolvedValueOnce({
					completion_message: { content: { text: JSON.stringify(mockClassification1) } }
				})
				.mockResolvedValueOnce({
					completion_message: { content: { text: JSON.stringify(mockClassification2) } }
				});

			const result = await llamaService.getMerchantInsights(charges);

			expect(result.topCategories).toEqual([
				{ category: 'Retail', total: 175.0 },
				{ category: 'Transportation', total: 50.0 }
			]);

			expect(result.topSubcategories).toEqual([
				{ subcategory: 'Grocery Store', total: 175.0 },
				{ subcategory: 'Gas Station', total: 50.0 }
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
				{ category: 'Retail', total: 400.0 },
				{ category: 'Transportation', total: 100.0 }
			];

			const charges = [{ amount: 400.0 }, { amount: 100.0 }];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toContainEqual({
				type: 'high_spending',
				category: 'Retail',
				percentage: 80,
				message:
					'Retail represents 80% of your spending. Consider setting a budget for this category.'
			});
		});

		it('should generate dining insight when dining spending exceeds 20%', () => {
			const topCategories = [
				{ category: 'Dining', total: 300.0 },
				{ category: 'Transportation', total: 100.0 }
			];

			const charges = [{ amount: 300.0 }, { amount: 100.0 }];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toContainEqual({
				type: 'dining_insight',
				percentage: 75,
				message: 'Dining represents 75% of your spending. Consider meal planning to reduce costs.'
			});
		});

		it('should return empty array when no suggestions apply', () => {
			const topCategories = [
				{ category: 'Transportation', total: 15.0 },
				{ category: 'Entertainment', total: 35.0 }
			];

			const charges = [{ amount: 15.0 }, { amount: 35.0 }];

			const suggestions = llamaService.generateSuggestions(topCategories, [], charges);

			expect(suggestions).toEqual([]);
		});
	});
});
