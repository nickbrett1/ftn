<script>
	import { browser } from '$app/environment';
	
	// Get git info from build-time constants
	const commitHash = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'unknown';
	const branchName = typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'unknown';
	
	// Check if this is a preview deployment
	const isPreview = $derived(browser && window.location.hostname.includes('preview'));
</script>

<!-- Deployment info - small and discrete -->
{#if browser}
	<div class="text-center py-2 text-xs text-gray-500/30 font-mono">
		Branch: {branchName} | Commit: {commitHash} | Env: {isPreview ? 'preview' : 'production'}
	</div>
{/if}