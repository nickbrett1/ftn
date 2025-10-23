/**
 * Shared PDF utilities for client-side PDF processing
 * Used by ccbilling-pdf-service.js
 */
export class PDFUtils {
	/**
	 * Configure PDF.js worker for browser environment
	 */
	static configureWorker() {
		// Only configure in browser environment
		if (typeof window === 'undefined') {
			return;
		}

		// Import PDF.js only when needed
		import('pdfjs-dist')
			.then((pdfjsLib) => {
				// Use the local worker file that gets copied during build
				// In test environment, use a mock worker or disable worker
				if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
					// Use a mock worker in test environment
					pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
					console.log('📄 PDF.js worker disabled for test environment');
				} else {
					pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
					console.log('📄 PDF.js worker configured with local file');
				}
			})
			.catch((error) => {
				console.warn('PDF.js not available:', error);
			});
	}

	/**
	 * Extract text content from all pages of a PDF document
	 * @param {Object} pdfDocument - PDF.js document object
	 * @param {Object} options - Extraction options
	 * @param {boolean} options.sortByPosition - Whether to sort text by position (default: true)
	 * @param {boolean} options.groupByLine - Whether to group text by line (default: true)
	 * @returns {Promise<string>} - Combined text from all pages
	 */
	static async extractTextFromPDF(pdfDocument, options = {}) {
		const { sortByPosition = true, groupByLine = true } = options;
		const textParts = [];

		for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
			const page = await pdfDocument.getPage(pageNum);
			const textContent = await page.getTextContent();

			if (groupByLine) {
				// Group text items by Y position (line) for better readability
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
			} else {
				// Simple text extraction without grouping
				const pageText = textContent.items.map((item) => item.str).join(' ');
				textParts.push(pageText);
			}
		}

		return textParts.join('\n');
	}

	/**
	 * Parse a PDF file and extract text content
	 * @param {File|Buffer} pdfFile - PDF file or buffer
	 * @param {Object} options - Parsing options
	 * @returns {Promise<string>} - Extracted text content
	 */
	static async parsePDFFile(pdfFile, options = {}) {
		// Only run in browser environment
		if (typeof window === 'undefined') {
			throw new Error('PDF parsing not available in server environment');
		}

		try {
			// Import PDF.js only when needed
			const pdfjsLib = await import('pdfjs-dist');

			// Configure worker if not already done
			if (pdfjsLib.GlobalWorkerOptions.workerSrc !== '/pdf.worker.min.mjs') {
				pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
			}

			console.log('📄 Loading PDF with PDF.js...');

			// Convert file to ArrayBuffer
			let arrayBuffer;
			if (pdfFile instanceof File) {
				arrayBuffer = await pdfFile.arrayBuffer();
			} else if (Buffer.isBuffer(pdfFile)) {
				arrayBuffer = pdfFile.buffer.slice(
					pdfFile.byteOffset,
					pdfFile.byteOffset + pdfFile.byteLength
				);
			} else {
				throw new Error('Invalid PDF file format');
			}

			// Load PDF document
			const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
			const pdf = await loadingTask.promise;

			console.log('📄 PDF loaded:', pdf.numPages, 'pages');

			// Extract text from all pages
			const allText = await this.extractTextFromPDF(pdf, options);

			console.log('📄 Text extracted from PDF');

			return allText;
		} catch (error) {
			console.error('❌ PDF parsing failed:', error);
			throw new Error(`PDF parsing failed: ${error.message}`);
		}
	}

	/**
	 * Parse a credit card statement from a PDF file
	 * @param {File|Buffer} pdfFile - PDF file or buffer
	 * @param {Object} parserFactory - Parser factory instance
	 * @param {Object} options - Parsing options
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	static async parseStatement(pdfFile, parserFactory, options = {}) {
		try {
			// Validate PDF file
			this.validatePDFFile(pdfFile);

			// Use shared PDF parsing logic
			const parsedData = await this.parsePDFFile(pdfFile, options);

			// Parse the extracted text using the parser factory
			const result = await parserFactory.parseStatement(parsedData);

			console.log('✅ Statement parsed successfully');
			return result;
		} catch (error) {
			console.error('❌ Statement parsing failed:', error);
			throw new Error(`Statement parsing failed: ${error.message}`);
		}
	}

	/**
	 * Validate a PDF file
	 * @param {File|Buffer} pdfFile - PDF file or buffer to validate
	 * @param {Object} options - Validation options
	 * @param {number} options.maxSize - Maximum file size in bytes (default: 10MB)
	 * @returns {boolean} - True if valid
	 */
	static validatePDFFile(pdfFile, options = {}) {
		const { maxSize = 10 * 1024 * 1024 } = options; // 10MB default

		if (!pdfFile) {
			throw new Error('No PDF file provided');
		}

		// Check file size
		let fileSize = 0;
		if (pdfFile instanceof File) {
			fileSize = pdfFile.size;
		} else if (Buffer.isBuffer(pdfFile)) {
			fileSize = pdfFile.length;
		} else {
			throw new Error('Invalid PDF file format');
		}

		if (fileSize > maxSize) {
			throw new Error(`PDF file too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
		}

		// Check file type for File objects
		if (pdfFile instanceof File) {
			const mimeType = pdfFile.type;
			if (mimeType !== 'application/pdf') {
				throw new Error('Invalid file type. Only PDF files are supported.');
			}
		}

		return true;
	}
}
