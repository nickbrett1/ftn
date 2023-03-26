<script>
	import fintechgreen from '$lib/assets/images/fintechgreen.png?run';

	import Img from '@zerodevx/svelte-img';
	import Header from '$lib/components/Header.svelte';
</script>

<div class="block">
	<Header/>
	<Img src={fintechgreen} loading="eager" alt="background" /> 
</div>