#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

try {
	// Get the current git commit hash
	const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
	
	// Get the current branch name
	const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
	
	console.log(`📝 Injecting git info: Branch: ${branchName}, Commit: ${commitHash}`);
	
	// Read the built HTML file
	const htmlPath = '.svelte-kit/cloudflare/index.html';
	if (fs.existsSync(htmlPath)) {
		let html = fs.readFileSync(htmlPath, 'utf8');
		
		// Replace placeholders
		html = html.replace(/%GIT_COMMIT%/g, commitHash);
		html = html.replace(/%GIT_BRANCH%/g, branchName);
		
		// Write back to file
		fs.writeFileSync(htmlPath, html);
		console.log('✅ Git info injected successfully');
	} else {
		console.log('⚠️  HTML file not found, skipping git info injection');
	}
} catch (error) {
	console.error('❌ Error injecting git info:', error.message);
	// Don't fail the build, just log the error
}