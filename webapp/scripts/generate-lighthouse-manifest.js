#!/usr/bin/env node

/**
 * Script to generate manifest specifically for Lighthouse tests
 * This ensures the manifest uses the correct preview server URL (127.0.0.1:4173)
 * Run with: node scripts/generate-lighthouse-manifest.js
 */

import fs from 'fs';
import path from 'path';

function generateLighthouseManifest() {
	const baseUrl = 'http://127.0.0.1:4173';
	
	console.log(`🔧 Generating Lighthouse test manifest...`);
	console.log(`Base URL: ${baseUrl}`);
	
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
	
	// Write the Lighthouse manifest
	const outputPath = path.join(process.cwd(), 'static/manifest-lighthouse.json');
	fs.writeFileSync(outputPath, JSON.stringify(manifest, null, '\t'));
	console.log(`✅ Lighthouse manifest generated successfully at static/manifest-lighthouse.json`);
	
	// Only update the main manifest.json if this is actually being used for Lighthouse tests
	// (i.e., when LIGHTHOUSE_ENABLED is set and we're in CI)
	if (process.env.LIGHTHOUSE_ENABLED && process.env.CIRCLECI) {
		const mainManifestPath = path.join(process.cwd(), 'static/manifest.json');
		fs.writeFileSync(mainManifestPath, JSON.stringify(manifest, null, '\t'));
		console.log(`✅ Main manifest.json updated for Lighthouse tests`);
	} else {
		console.log(`ℹ️  Main manifest.json not updated (not in Lighthouse CI environment)`);
	}
	
	return manifest;
}

function main() {
	try {
		generateLighthouseManifest();
		console.log(`🎯 Lighthouse manifest ready for testing!`);
	} catch (error) {
		console.error(`❌ Error generating Lighthouse manifest:`, error.message);
		process.exit(1);
	}
}

main();