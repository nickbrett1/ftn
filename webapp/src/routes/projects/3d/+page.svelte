<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	onMount(() => {
		goto('/projects/3dheatmap');
	});
</script>

<div class="min-h-screen bg-zinc-900 flex items-center justify-center">
	<div class="text-center">
		<div class="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
		<p class="text-white text-lg">Redirecting to 3D Heatmap...</p>
	</div>
</div>
