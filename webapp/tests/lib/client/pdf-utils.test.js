import { describe, it, expect, vi } from 'vitest';
import { PDFUtils } from '../../../src/lib/client/pdf-utils.js';

describe('PDFUtils.extractTextFromPDF', () => {
	it('should handle normal text items', async () => {
		const mockPdf = {
			numPages: 1,
			getPage: vi.fn().mockResolvedValue({
				getTextContent: vi.fn().mockResolvedValue({
					items: [
						{ str: 'Hello', transform: [1, 0, 0, 1, 10, 20] },
						{ str: 'World', transform: [1, 0, 0, 1, 50, 20] }
					]
				})
			})
		};

		const result = await PDFUtils.extractTextFromPDF(mockPdf);
		expect(result).toBe('Hello World');
	});

	it('should handle undefined items gracefully', async () => {
		const mockPdf = {
			numPages: 1,
			getPage: vi.fn().mockResolvedValue({
				getTextContent: vi.fn().mockResolvedValue({
					items: undefined
				})
			})
		};

		const result = await PDFUtils.extractTextFromPDF(mockPdf);
		expect(result).toBe('');
	});

	it('should handle null textContent gracefully', async () => {
		const mockPdf = {
			numPages: 1,
			getPage: vi.fn().mockResolvedValue({
				getTextContent: vi.fn().mockResolvedValue(null)
			})
		};

		const result = await PDFUtils.extractTextFromPDF(mockPdf);
		expect(result).toBe('');
	});

	it('should handle items as a plain object without throwing undefined is not a function', async () => {
		const mockPdf = {
			numPages: 1,
			getPage: vi.fn().mockResolvedValue({
				getTextContent: vi.fn().mockResolvedValue({
					// This simulates PDF.js returning an object instead of an array
					items: { 0: { str: 'Test', transform: [1,0,0,1,0,0] } }
				})
			})
		};

		let error = null;
		try {
			await PDFUtils.extractTextFromPDF(mockPdf);
		} catch (e) {
			error = e;
		}

		// The test expects this to NOT throw or to throw a specific error
		// We log the error type to see what it is
		if (error) {
			console.log('Error caught:', error.message);
		}
		expect(error).toBeNull();
	});
});
