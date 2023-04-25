<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
</script>

<div>
	<Header/>
	<Background/>
	
	<div class="aspect-square relative z-10">
		<Canvas/>
	</div>
</div>