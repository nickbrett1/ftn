<script>
	import icon from '$lib/images/bloomberg-icon.jpeg';
	import { onMount } from 'svelte';
	
	let imgElement = $state();
	
	onMount(() => {
		if (imgElement) {
			// Add intersection observer for lazy loading
			const observer = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						imgElement.classList.add('loaded');
						observer.unobserve(imgElement);
					}
				});
			});
			
			observer.observe(imgElement);
		}
	});
</script>

<div style="width: 64px; height: 64px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
	<img 
		bind:this={imgElement}
		src={icon} 
		alt="Bloomberg" 
		style="width: 64px; height: 64px; max-width: 64px; max-height: 64px; min-width: 64px; min-height: 64px; object-fit: contain; object-position: center;"
		loading="lazy"
		decoding="async"
	/>
</div>
