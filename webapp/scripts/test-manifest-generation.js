#!/usr/bin/env node

/**
 * Test script to verify manifest generation works correctly
 * Run with: node scripts/test-manifest-generation.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function testManifestGeneration() {
	console.log('🧪 Testing manifest generation...\n');
	
	const testCases = [
		{
			name: 'Development Manifest',
			command: 'npm run manifest:dev',
			expectedUrl: 'http://localhost:5173',
			outputFile: 'static/manifest-dev.json'
		},
		{
			name: 'Preview Manifest',
			command: 'npm run manifest:preview',
			expectedUrl: 'https://ftn-preview.nick-brett1.workers.dev',
			outputFile: 'static/manifest-preview.json'
		},
		{
			name: 'Production Manifest',
			command: 'npm run manifest:production',
			expectedUrl: 'https://fintechnick.com',
			outputFile: 'static/manifest.json'
		},
		{
			name: 'Lighthouse Manifest',
			command: 'npm run manifest:lighthouse',
			expectedUrl: 'http://127.0.0.1:4173',
			outputFile: 'static/manifest-lighthouse.json'
		}
	];
	
	let allTestsPassed = true;
	
	for (const testCase of testCases) {
		console.log(`🔧 Testing: ${testCase.name}`);
		
		try {
			// Run the manifest generation command
			execSync(testCase.command, { cwd: process.cwd(), stdio: 'pipe' });
			console.log(`  ✅ Command executed successfully`);
			
			// Check if the output file exists
			if (fs.existsSync(testCase.outputFile)) {
				console.log(`  ✅ Output file created: ${testCase.outputFile}`);
				
				// Read and verify the manifest content
				const manifestContent = fs.readFileSync(testCase.outputFile, 'utf8');
				const manifest = JSON.parse(manifestContent);
				
				// Check if the manifest contains the expected URL
				const iconUrls = manifest.icons.map(icon => icon.src);
				const hasExpectedUrl = iconUrls.some(url => url.includes(testCase.expectedUrl));
				
				if (hasExpectedUrl) {
					console.log(`  ✅ Manifest contains expected URL: ${testCase.expectedUrl}`);
				} else {
					console.log(`  ❌ Manifest does not contain expected URL: ${testCase.expectedUrl}`);
					console.log(`     Found URLs: ${iconUrls.join(', ')}`);
					allTestsPassed = false;
				}
				
				// Verify manifest structure
				if (manifest.name && manifest.icons && manifest.icons.length > 0) {
					console.log(`  ✅ Manifest structure is valid`);
				} else {
					console.log(`  ❌ Manifest structure is invalid`);
					allTestsPassed = false;
				}
				
			} else {
				console.log(`  ❌ Output file not found: ${testCase.outputFile}`);
				allTestsPassed = false;
			}
			
		} catch (error) {
			console.log(`  ❌ Command failed: ${error.message}`);
			allTestsPassed = false;
		}
		
		console.log('');
	}
	
	// Summary
	if (allTestsPassed) {
		console.log('🎉 All manifest generation tests passed!');
	} else {
		console.log('❌ Some tests failed. Please check the output above.');
		process.exit(1);
	}
}

// Run tests
testManifestGeneration();