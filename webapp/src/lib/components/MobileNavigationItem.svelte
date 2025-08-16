<script>
	import { onMount } from 'svelte';
	
	let { current = 'home', active = 'home', hide = () => {} } = $props();

	onMount(() => {
		console.log(`MobileNavigationItem: Component mounted for ${current}`);
		const targetId = current;
		const element = document.getElementById(targetId);
		console.log(`MobileNavigationItem: On mount - Element ${targetId} found:`, element);
		
		// Check all sections
		const sections = document.querySelectorAll('.section');
		console.log(`MobileNavigationItem: All sections found:`, Array.from(sections).map(el => ({ id: el.id, className: el.className })));
		
		// Check if the target section exists
		const targetSection = document.querySelector(`#${targetId}.section`);
		console.log(`MobileNavigationItem: Target section ${targetId} found:`, targetSection);
	});

	const handleClick = (event) => {
		console.log(`MobileNavigationItem: Click event triggered for ${current}`);
		
		event.preventDefault();
		event.stopPropagation();
		
		// Close the mobile menu immediately
		hide();
		
		// Simple hash navigation
		const targetId = current;
		const element = document.getElementById(targetId);
		
		console.log(`MobileNavigationItem: Looking for element with id "${targetId}"`);
		console.log(`MobileNavigationItem: Found element:`, element);
		console.log(`MobileNavigationItem: All elements with IDs:`, Array.from(document.querySelectorAll('[id]')).map(el => el.id));
		
		if (element) {
			console.log(`MobileNavigationItem: Scrolling to ${targetId}`);
			
			// Try to scroll to the element
			try {
				element.scrollIntoView({ 
					behavior: 'smooth', 
					block: 'start'
				});
				
				// Update URL hash
				window.history.pushState(null, '', `#${targetId}`);
				console.log(`MobileNavigationItem: Successfully scrolled to ${targetId}`);
			} catch (error) {
				console.error(`MobileNavigationItem: Error scrolling to ${targetId}:`, error);
				
				// Fallback to instant scroll if smooth scroll fails
				element.scrollIntoView({ 
					behavior: 'auto', 
					block: 'start'
				});
			}
		} else {
			console.log(`MobileNavigationItem: Element ${targetId} not found`);
			console.log(`MobileNavigationItem: Available elements:`, document.querySelectorAll('[id]'));
		}
	};
</script>

<li>
	<a
		href="/#{current}"
		class="block py-3 px-2 {active == current ? 'text-green-400' : ''} cursor-pointer touch-manipulation select-none"
		on:click={handleClick}
		on:pointerdown={() => {
			console.log(`MobileNavigationItem: Pointer down for ${current}`);
		}}
		aria-label="Navigate to {current} section"
		role="menuitem"
	>
		{current}
	</a>
</li>
