<script>
	import { Carousel, Thumbnails } from 'flowbite-svelte';
	import images from './imageData/images.json';

	let index = 0;
	let forward = true; // sync animation direction between Thumbnails and Carousel
</script>

<div class="w-full space-y-4 p-20">
	<Carousel {images} {forward} let:Indicators let:Controls bind:index>
		<Controls />
		<Indicators />
	</Carousel>
	<Thumbnails {images} {forward} bind:index />
</div>
