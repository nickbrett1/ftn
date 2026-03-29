/**
 * Shared PDF utilities for client-side PDF processing
 * Used by ccbilling-pdf-service.js
 */
export const PDFUtils = {
	/**
	 * Configure PDF.js worker for browser environment
	 */
	configureWorker() {
		// Only configure in browser environment
		if (globalThis.window == undefined) {
			return Promise.resolve();
		}

		// Import PDF.js only when needed
		return import('pdfjs-dist')
			.then((pdfjsLibrary) => {
				// Use the local worker file that gets copied during build
				// In test environment, use a mock worker or disable worker
				if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
					// Use legacy build in test environment to avoid worker issues
					pdfjsLibrary.GlobalWorkerOptions.workerSrc = null;
					console.log('📄 PDF.js worker disabled for test environment');
				} else {
					pdfjsLibrary.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
					console.log('📄 PDF.js worker configured with local file');
				}
			})
			.catch((error) => {
				console.warn('PDF.js not available:', error);
			});
	},

	/**
	 * Extract text content from all pages of a PDF document
	 * @param {Object} pdfDocument - PDF.js document object
	 * @param {Object} options - Extraction options
	 * @param {boolean} options.sortByPosition - Whether to sort text by position (default: true)
	 * @param {boolean} options.groupByLine - Whether to group text by line (default: true)
	 * @returns {Promise<string>} - Combined text from all pages
	 */
	async extractTextFromPDF(pdfDocument, options = {}) {
		const { groupByLine = true } = options;
		const textParts = [];

		for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
			const page = await pdfDocument.getPage(pageNumber);
			const textContent = await page.getTextContent();

			// textContent.items may be an array-like object or Proxy without Symbol.iterator in some environments
			const items = Array.isArray(textContent?.items)
				? textContent.items
				: Object.values(textContent?.items || {});

			if (groupByLine) {
				const sortedLines = this._groupAndSortTextItems(items);
				textParts.push(sortedLines.join('\n'));
			} else {
				// Simple text extraction without grouping
				const pageText = items.map((item) => item.str).join(' ');
				textParts.push(pageText);
			}
		}

		return textParts.join('\n');
	},

	/**
	 * Group text items by line (Y position) and sort them
	 * @param {Array} items - Array of text items
	 * @returns {Array<string>} - Sorted lines of text
	 * @private
	 */
	_groupAndSortTextItems(items) {
		const lines = items.reduce((acc, item) => {
			const y = Math.round(item.transform[5]); // Round Y position to group nearby items
			if (!acc[y]) {
				acc[y] = [];
			}
			acc[y].push({
				text: item.str,
				x: item.transform[4]
			});
			return acc;
		}, {});

		// Sort lines by Y position (top to bottom)
		return Object.keys(lines)
			.sort((a, b) => Number.parseInt(b) - Number.parseInt(a)) // Sort Y positions in descending order
			.map((y) => {
				// Sort items within each line by X position (left to right)
				return lines[y]
					.sort((a, b) => a.x - b.x)
					.map((item) => item.text)
					.join(' ')
					.trim();
			})
			.filter((line) => line.length > 0); // Remove empty lines
	},

	/**
	 * Parse a PDF file and extract text content
	 * @param {File|Buffer} pdfFile - PDF file or buffer
	 * @param {Object} options - Parsing options
	 * @returns {Promise<string>} - Extracted text content
	 */
	async parsePDFFile(pdfFile, options = {}) {
		// Only run in browser environment
		if (globalThis.window == undefined) {
			throw new TypeError('PDF parsing not available in server environment');
		}

		try {
			// Import PDF.js only when needed
			// Use legacy build in test environment to avoid worker issues
			const pdfjsLibrary =
				typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
					? await import('pdfjs-dist/legacy/build/pdf.mjs')
					: await import('pdfjs-dist');

			// Configure worker if not already done
			if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
				// Legacy build doesn't need worker configuration
				console.log('📄 Using PDF.js legacy build for test environment');
			} else if (pdfjsLibrary.GlobalWorkerOptions.workerSrc !== '/pdf.worker.min.mjs') {
				pdfjsLibrary.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
			}

			console.log('📄 Loading PDF with PDF.js...');

			// Convert file to ArrayBuffer
			let arrayBuffer;
			if (pdfFile instanceof File || pdfFile instanceof Blob) {
				arrayBuffer = await pdfFile.arrayBuffer();
			} else if (pdfFile instanceof ArrayBuffer) {
				arrayBuffer = pdfFile;
			} else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(pdfFile)) {
				arrayBuffer = pdfFile.buffer.slice(
					pdfFile.byteOffset,
					pdfFile.byteOffset + pdfFile.byteLength
				);
			} else {
				throw new TypeError('Invalid PDF file format');
			}

			// Load PDF document
			const loadingTask = pdfjsLibrary.getDocument({
				data: arrayBuffer,
				cMapUrl: 'https://unpkg.com/pdfjs-dist@5.5.207/cmaps/',
				cMapPacked: true,
				standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.5.207/standard_fonts/'
			});
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
	},

	/**
	 * Parse a credit card statement from a PDF file
	 * @param {File|Buffer} pdfFile - PDF file or buffer
	 * @param {Object} parserFactory - Parser factory instance
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	async parseStatement(pdfFile, parserFactory) {
		try {
			// Validate PDF file
			this.validatePDFFile(pdfFile);

			// Use shared PDF parsing logic
			const parsedData = await this.parsePDFFile(pdfFile);

			// Parse the extracted text using the parser factory
			const result = await parserFactory.parseStatement(parsedData);

			console.log('✅ Statement parsed successfully');
			return result;
		} catch (error) {
			console.error('❌ Statement parsing failed:', error);
			throw new Error(`Statement parsing failed: ${error.message}`);
		}
	},

	/**
	 * Validate a PDF file
	 * @param {File|Buffer} pdfFile - PDF file or buffer to validate
	 * @param {Object} options - Validation options
	 * @param {number} options.maxSize - Maximum file size in bytes (default: 10MB)
	 * @returns {boolean} - True if valid
	 */
	validatePDFFile(pdfFile, options = {}) {
		const { maxSize = 10 * 1024 * 1024 } = options; // 10MB default

		if (!pdfFile) {
			throw new Error('No PDF file provided');
		}

		// Check file size
		let fileSize = 0;
		if (pdfFile instanceof File || pdfFile instanceof Blob) {
			fileSize = pdfFile.size;
		} else if (pdfFile instanceof ArrayBuffer) {
			fileSize = pdfFile.byteLength;
		} else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(pdfFile)) {
			fileSize = pdfFile.length;
		} else {
			throw new TypeError('Invalid PDF file format');
		}

		if (fileSize > maxSize) {
			throw new Error(`PDF file too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
		}

		// Skip strict MIME type check for ArrayBuffers, but enforce for File/Blob if provided
		if (pdfFile instanceof File || pdfFile instanceof Blob) {
			const mimeType = pdfFile.type;
			if (mimeType && mimeType !== 'application/pdf' && mimeType !== '') {
				throw new Error('Invalid file type. Only PDF files are supported.');
			}
		}

		return true;
	}
};
