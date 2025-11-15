#!/usr/bin/env node

import { copyFile, access, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceFile = join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetFile = join(__dirname, '../static/pdf.worker.min.mjs');

async function copyPDFWorker() {
	try {
		// Check if source file exists
		await access(sourceFile);

		// Read package.json to get pdfjs-dist version
		const packageJsonPath = join(__dirname, '../package.json');
		const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
		const pdfjsVersion = packageJson.dependencies['pdfjs-dist'];

		console.log(`📄 Copying PDF.js worker (version ${pdfjsVersion})...`);

		// Ensure target directory exists
		const targetDir = dirname(targetFile);
		await access(targetDir);

		// Copy the worker file
		await copyFile(sourceFile, targetFile);

		console.log('✅ PDF.js worker file copied successfully');
		console.log(`   From: ${sourceFile}`);
		console.log(`   To: ${targetFile}`);
		console.log(`   Version: ${pdfjsVersion}`);
		console.log('   The worker file will be available at /pdf.worker.min.mjs');
		console.log('   Note: This file is gitignored to ensure version consistency');
	} catch (error) {
		console.error('❌ Failed to copy PDF.js worker file:', error.message);
		console.error('   This will cause PDF parsing to fail at runtime.');
		console.error('   Please ensure pdfjs-dist is installed: npm install pdfjs-dist');
		process.exit(1);
	}
}

copyPDFWorker();
