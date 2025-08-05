#!/usr/bin/env node

import { access, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceFile = join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetFile = join(__dirname, '../static/pdf.worker.min.mjs');

async function checkPDFWorker() {
	try {
		// Check if both files exist
		await access(sourceFile);
		await access(targetFile);

		// Get file stats
		const sourceStats = await stat(sourceFile);
		const targetStats = await stat(targetFile);

		// Read package.json to get pdfjs-dist version
		const packageJsonPath = join(__dirname, '../package.json');
		const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
		const pdfjsVersion = packageJson.dependencies['pdfjs-dist'];

		console.log(`📄 PDF.js worker status:`);
		console.log(`   Installed version: ${pdfjsVersion}`);
		console.log(`   Source file: ${sourceFile}`);
		console.log(`   Target file: ${targetFile}`);
		console.log(`   Source modified: ${sourceStats.mtime.toISOString()}`);
		console.log(`   Target modified: ${targetStats.mtime.toISOString()}`);

		if (sourceStats.mtime > targetStats.mtime) {
			console.log('⚠️  Worker file is outdated. Run "npm run predev" to update.');
			process.exit(1);
		} else {
			console.log('✅ Worker file is up to date');
		}
	} catch (error) {
		console.error('❌ Error checking PDF worker:', error.message);
		console.error('   Run "npm run predev" to copy the worker file.');
		process.exit(1);
	}
}

checkPDFWorker();
