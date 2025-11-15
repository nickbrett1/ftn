// PDF Processing Web Worker
// This worker handles heavy PDF operations to keep the main thread responsive

// For module workers, we need to import dynamically
let pdfjsLibrary = null;

globalThis.onmessage = async function (e) {
	const { type, data } = e.data;

	try {
		if (type === 'parsePDF') {
			const result = await parsePDFInWorker(data);
			self.postMessage({ type: 'parsePDFResult', data: result });
		} else {
			throw new Error(`Unknown message type: ${type}`);
		}
	} catch (error) {
		self.postMessage({
			type: 'error',
			error: error.message,
			stack: error.stack
		});
	}
};

async function parsePDFInWorker({ arrayBuffer, options = {} }) {
	// PDF.js operations happen in the worker thread
	if (!pdfjsLibrary) {
		pdfjsLibrary = await import('pdfjs-dist');
	}

	// Load PDF document
	const loadingTask = pdfjsLibrary.getDocument({ data: arrayBuffer });
	const pdf = await loadingTask.promise;

	// Extract text from all pages
	const allText = await extractTextFromPDF(pdf, options);

	return allText;
}

async function extractTextFromPDF(pdfDocument, options = {}) {
	const { groupByLine = true } = options;
	const textParts = [];

	for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
		const page = await pdfDocument.getPage(pageNumber);
		const textContent = await page.getTextContent();

		if (groupByLine) {
			// Group text items by Y position (line) for better readability
			const lines = {};
			for (const item of textContent.items) {
				const y = Math.round(item.transform[5]); // Round Y position to group nearby items
				if (!lines[y]) {
					lines[y] = [];
				}
				lines[y].push({
					text: item.str,
					x: item.transform[4]
				});
			}

			// Sort lines by Y position (top to bottom)
			const sortedLines = Object.keys(lines)
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

			textParts.push(sortedLines.join('\n'));
		} else {
			// Simple text extraction without grouping
			const pageText = textContent.items.map((item) => item.str).join(' ');
			textParts.push(pageText);
		}
	}

	return textParts.join('\n');
}
