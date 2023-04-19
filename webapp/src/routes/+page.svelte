<script>
	import Header from '$lib/components/Header.svelte';
	import Background from '$lib/components/Background.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
</script>

<div class="block">
	<Header/>
	<Background/>
	
	<div class="aspect-square fixed left-[5%] right-[5%] z-10">
		<Canvas/>
	</div>
</div>