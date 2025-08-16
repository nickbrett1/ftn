<script>
	import icon from '$lib/images/bloomberg-icon.jpeg';
	import { onMount } from 'svelte';
	
	let imgElement;
	
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

<img 
	bind:this={imgElement}
	src={icon} 
	alt="Bloomberg" 
	class="h-full w-full object-contain max-w-full max-h-full"
	style="max-width: 100% !important; max-height: 100% !important; width: 100% !important; height: 100% !important; object-fit: contain !important;"
	loading="lazy"
	decoding="async"
/>
