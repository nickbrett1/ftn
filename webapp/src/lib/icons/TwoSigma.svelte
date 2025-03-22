<script>
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';

	onMount(() => {
		tippy('#twosigmalogo', {
			content: 'Two Sigma'
		});
	});
</script>

<svg
	id="twosigmalogo"
	viewBox="0 0 108 108"
	version="1.1"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:svg="http://www.w3.org/2000/svg"
>
	<path d="M 53.7,0 0,54.2 l 53.7,54 54,-54 z" fill="#009aa6" id="path2" />
	<path
		d="M 25.4,69.5 C 25,52.1 45.6,54.4 45.6,45.6 c 0,-2.9 -2.1,-5.4 -7.1,-5.4 -3.7,0 -7.3,1.9 -9.8,4.2 L 25,40.6 c 3.1,-3.1 8.3,-5.7 13.8,-5.7 8.5,0 12.9,4.8 12.9,10.5 0,13.2 -20,10.9 -20,21.8 h 19.8 v 5.2 h -26 v -2.9 z m 41.7,-1.3 c -4,0 -6.5,-2.5 -6.5,-7.5 0,-6.3 4.2,-11.9 9.2,-11.9 4,0 6.5,2.5 6.5,7.5 -0.1,6.3 -4.2,11.9 -9.2,11.9 z M 92.3,43.9 H 70.2 c -9,0 -15.6,7.1 -15.6,16.7 0,7.8 4.8,12.3 11.9,12.3 9,0 15.8,-7.3 15.8,-16.7 0,-3.1 -0.8,-5.9 -2.3,-7.8 h 7.7 z"
		fill="#ffffff"
		id="path3"
	/>
</svg>
