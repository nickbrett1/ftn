/**
 * Server-side PDF utilities for PDF processing in Node.js environment
 * Used by server-side routes that need to parse PDF files
 */
import pdf from 'pdf-parse';

export class ServerPDFUtils {
	/**
	 * Extract text content from a PDF file using pdf-parse
	 * @param {Buffer|ArrayBuffer} pdfBuffer - PDF file buffer
	 * @param {Object} options - Extraction options
	 * @returns {Promise<string>} - Extracted text content
	 */
	static async extractTextFromPDF(pdfBuffer, options = {}) {
		try {
			console.log('📄 Extracting text from PDF using pdf-parse...');
			
			// Convert ArrayBuffer to Buffer if needed
			let buffer;
			if (pdfBuffer instanceof ArrayBuffer) {
				buffer = Buffer.from(pdfBuffer);
			} else if (Buffer.isBuffer(pdfBuffer)) {
				buffer = pdfBuffer;
			} else {
				throw new Error('Invalid PDF buffer format');
			}

			// Parse PDF and extract text
			const data = await pdf(buffer, options);
			
			console.log('📄 Text extracted from PDF:', data.numpages, 'pages');
			
			return data.text;
		} catch (error) {
			console.error('❌ PDF text extraction failed:', error);
			throw new Error(`PDF text extraction failed: ${error.message}`);
		}
	}

	/**
	 * Parse a PDF file and extract text content
	 * @param {File|Buffer|ArrayBuffer} pdfFile - PDF file, buffer, or ArrayBuffer
	 * @param {Object} options - Parsing options
	 * @returns {Promise<string>} - Extracted text content
	 */
	static async parsePDFFile(pdfFile, options = {}) {
		try {
			console.log('📄 Parsing PDF file on server...');

			// Convert file to buffer
			let buffer;
			if (pdfFile instanceof File) {
				const arrayBuffer = await pdfFile.arrayBuffer();
				buffer = Buffer.from(arrayBuffer);
			} else if (pdfFile instanceof ArrayBuffer) {
				buffer = Buffer.from(pdfFile);
			} else if (Buffer.isBuffer(pdfFile)) {
				buffer = pdfFile;
			} else {
				throw new Error('Invalid PDF file format');
			}

			// Extract text using pdf-parse
			const text = await this.extractTextFromPDF(buffer, options);

			console.log('📄 PDF parsed successfully on server');

			return text;
		} catch (error) {
			console.error('❌ PDF parsing failed:', error);
			throw new Error(`PDF parsing failed: ${error.message}`);
		}
	}

	/**
	 * Parse a credit card statement from a PDF file
	 * @param {File|Buffer|ArrayBuffer} pdfFile - PDF file, buffer, or ArrayBuffer
	 * @param {Object} parserFactory - Parser factory instance
	 * @param {Object} options - Parsing options
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	static async parseStatement(pdfFile, parserFactory, options = {}) {
		try {
			// Validate PDF file
			this.validatePDFFile(pdfFile);

			// Use server-side PDF parsing logic
			const parsedData = await this.parsePDFFile(pdfFile, options);

			// Parse the extracted text using the parser factory
			const result = await parserFactory.parseStatement(parsedData);

			console.log('✅ Statement parsed successfully on server');
			return result;
		} catch (error) {
			console.error('❌ Statement parsing failed:', error);
			throw new Error(`Statement parsing failed: ${error.message}`);
		}
	}

	/**
	 * Validate a PDF file
	 * @param {File|Buffer|ArrayBuffer} pdfFile - PDF file, buffer, or ArrayBuffer to validate
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
		} else if (pdfFile instanceof ArrayBuffer) {
			fileSize = pdfFile.byteLength;
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