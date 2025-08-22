#!/usr/bin/env node

/**
 * Script to generate environment-specific manifest files
 * Run with: node scripts/generate-manifest.js [environment]
 */

import fs from 'fs';
import path from 'path';

const environments = {
	development: {
		baseUrl: 'http://localhost:5173',
		outputFile: 'static/manifest-dev.json'
	},
	preview: {
		baseUrl: 'https://ftn-preview.nick-brett1.workers.dev',
		outputFile: 'static/manifest-preview.json'
	},
	production: {
		baseUrl: 'https://fintechnick.com',
		outputFile: 'static/manifest.json'
	}
};

// Special handling for Lighthouse tests in CI
const isLighthouseTest = process.env.CIRCLECI && process.env.LIGHTHOUSE_ENABLED;

function generateManifest(env) {
	let baseUrl = env.baseUrl;
	
	// Special case: If running Lighthouse tests in CI, use the preview server URL
	if (isLighthouseTest && env.baseUrl.includes('ftn-preview')) {
		baseUrl = 'http://127.0.0.1:4173';
		console.log(`🔧 Lighthouse test detected, using preview server URL: ${baseUrl}`);
	}
	
	const manifest = {
		name: "Fintech Nick",
		display: "standalone",
		icons: [
			{ 
				src: `${baseUrl}/icon-192.png`, 
				type: "image/png", 
				sizes: "192x192" 
			},
			{ 
				src: `${baseUrl}/icon-512.png`, 
				type: "image/png", 
				sizes: "512x512" 
			},
			{
				src: `${baseUrl}/icon-192-maskable.png`,
				type: "image/png",
				sizes: "192x192",
				purpose: "maskable"
			},
			{
				src: `${baseUrl}/icon-512-maskable.png`,
				type: "image/png",
				sizes: "512x512",
				purpose: "maskable"
			}
		],
		theme_color: "#FFFFFF",
		background_color: "#FFFFFF",
		start_url: "/",
		scope: "/"
	};
	
	return manifest;
}

function main() {
	const envArg = process.argv[2] || 'production';
	const env = environments[envArg];
	
	if (!env) {
		console.error(`Unknown environment: ${envArg}`);
		console.error(`Available environments: ${Object.keys(environments).join(', ')}`);
		process.exit(1);
	}
	
	console.log(`Generating manifest for ${envArg} environment...`);
	console.log(`Base URL: ${env.baseUrl}`);
	console.log(`Output file: ${env.outputFile}`);
	
	// Check if this is a Lighthouse test
	if (isLighthouseTest) {
		console.log(`🚨 Lighthouse test environment detected`);
	}
	
	const manifest = generateManifest(env);
	const outputPath = path.join(process.cwd(), env.outputFile);
	
	// Write the environment-specific manifest
	fs.writeFileSync(outputPath, JSON.stringify(manifest, null, '\t'));
	console.log(`✅ Environment-specific manifest generated successfully at ${env.outputFile}`);
	
	// For production and preview, also update the main manifest.json
	// This ensures app.html always references the correct manifest
	if (envArg === 'production' || envArg === 'preview') {
		const mainManifestPath = path.join(process.cwd(), 'static/manifest.json');
		fs.writeFileSync(mainManifestPath, JSON.stringify(manifest, null, '\t'));
		console.log(`✅ Main manifest.json updated for ${envArg} environment`);
	}
	
	// For development, create a symlink or copy to make it easy to test
	if (envArg === 'development') {
		const mainManifestPath = path.join(process.cwd(), 'static/manifest.json');
		try {
			// Copy the development manifest to the main manifest for local testing
			fs.copyFileSync(outputPath, mainManifestPath);
			console.log(`✅ Development manifest copied to main manifest.json for local testing`);
		} catch (error) {
			console.log(`ℹ️  Could not copy development manifest (this is normal in CI): ${error.message}`);
		}
	}
}

main();