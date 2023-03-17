<script>
	import unionjack from '$lib/assets/images/unionjack.webp?run';
	import Img from '@zerodevx/svelte-img';
	import Login from '$lib/components/Login.svelte';
</script>

<div class="block">
	<nav class="flex flex-wrap items-center bg-stone-800 p-3">
		<p class="whitespace-nowrap py-1 pr-3 text-2xl tracking-tight text-white">
			British Empire Management
		</p>
		<div class="mr-0 ml-auto text-white">
			<Login/>
		</div>
	</nav>
	<Img src={unionjack} loading="eager" alt="background" /> 
</div>