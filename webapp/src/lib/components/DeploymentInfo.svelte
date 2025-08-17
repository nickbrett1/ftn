<script>
	import { onMount } from 'svelte';
	
	let branchName = 'unknown';
	let commitHash = 'unknown';
	let isPreview = false;
	
	onMount(() => {
		// Try to get branch and commit from environment variables or build-time data
		if (typeof window !== 'undefined') {
			// Check if this is a preview deployment
			isPreview = window.location.hostname.includes('preview');
			
			// Try to get commit hash from meta tag or other build-time data
			const commitMeta = document.querySelector('meta[name="git-commit"]');
			if (commitMeta) {
				commitHash = commitMeta.getAttribute('content') || 'unknown';
			}
			
			// Try to get branch name from meta tag
			const branchMeta = document.querySelector('meta[name="git-branch"]');
			if (branchMeta) {
				branchName = branchMeta.getAttribute('content') || 'unknown';
			} else {
				// Fallback to deployment type
				branchName = isPreview ? 'preview' : 'main';
			}
		}
	});
</script>

<!-- Deployment info - small and discrete -->
<div class="text-center py-2 text-xs text-gray-500/30 font-mono">
	Branch: {branchName} | Commit: {commitHash} | Env: {isPreview ? 'preview' : 'production'}
</div>