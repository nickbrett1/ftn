<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
</script>

<div class="block">
	<Header/>
	<Background/>
	
	<div class="aspect-square fixed top-[150px] left-[150px] right-[150px]">
		<Canvas/>
	</div>
</div>