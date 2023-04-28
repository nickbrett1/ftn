<script>
	import Scene from '$lib/components/Scene.svelte'
	import { useProgress } from '@threlte/extras'
	import { tweened } from 'svelte/motion'
	import { fade } from 'svelte/transition'
	import { 
		Canvas, 
	} from '@threlte/core'

	const { progress } = useProgress()

	const tweenedProgress = tweened($progress)
	$: tweenedProgress.set($progress)
</script>

<div class="w-full h-full fixed aspect-square z-10">
	{#if $tweenedProgress < 1}
		<div
			transition:fade
			class="position-absolute w-full h-full top-0 left-0 flex flex-col gap-1 justify-center items-center"
		>
			<p class="text-sm leading-5 text-white">Loading</p>
			<div class="w-1/3 h-10 border border-white border-solid relative">
				<div class="h-full bg-green-800" style="width: {$tweenedProgress * 100}%" />
			</div>
		</div>
	{/if}

	<Canvas>
		<Scene />
	</Canvas>
</div>