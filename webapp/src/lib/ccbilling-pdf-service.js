import * as pdfjsLib from 'pdfjs-dist';
import { ParserFactory } from './ccbilling-parsers/parser-factory.js';

// Set the worker source to use the worker file from the npm package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url
).toString();

/**
 * Service for parsing credit card statements using PDF.js (Client-side)
 */
export class PDFService {
	constructor() {
		this.parserFactory = new ParserFactory();
	}

	/**
	 * Parse a PDF file and extract statement information
	 * @param {File} pdfFile - PDF file from input
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	async parseStatement(pdfFile) {
		try {
			// Convert file to ArrayBuffer
			const arrayBuffer = await pdfFile.arrayBuffer();

			// Load the PDF document
			const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
			const pdfDocument = await loadingTask.promise;

			// Extract text from all pages
			const allText = await this.extractTextFromPDF(pdfDocument);

			// Parse the statement using appropriate parser
			const parsedData = await this.parserFactory.parseStatement(allText);

			return parsedData;
		} catch (error) {
			console.error('❌ PDF parsing failed:', error);
			throw new Error(`PDF parsing failed: ${error.message}`);
		}
	}

	/**
	 * Extract text content from all pages of a PDF
	 * @param {Object} pdfDocument - PDF.js document object
	 * @returns {Promise<string>} - Combined text from all pages
	 */
	async extractTextFromPDF(pdfDocument) {
		const textParts = [];

		for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
			const page = await pdfDocument.getPage(pageNum);
			const textContent = await page.getTextContent();

			// Group text items by Y position (line)
			const lines = {};
			textContent.items.forEach((item) => {
				const y = Math.round(item.transform[5]); // Round Y position to group nearby items
				if (!lines[y]) {
					lines[y] = [];
				}
				lines[y].push({
					text: item.str,
					x: item.transform[4]
				});
			});

			// Sort lines by Y position (top to bottom)
			const sortedLines = Object.keys(lines)
				.sort((a, b) => parseInt(b) - parseInt(a)) // Sort Y positions in descending order
				.map((y) => {
					// Sort items within each line by X position (left to right)
					return lines[y]
						.sort((a, b) => a.x - b.x)
						.map((item) => item.text)
						.join(' ')
						.trim();
				})
				.filter((line) => line.length > 0); // Remove empty lines

			textParts.push(sortedLines.join('\n'));
		}

		const allText = textParts.join('\n');
		return allText;
	}

	/**
	 * Get list of supported credit card providers
	 * @returns {Array} - Array of supported provider names
	 */
	getSupportedProviders() {
		return this.parserFactory.getSupportedProviders();
	}
}
