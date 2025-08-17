<script>
	import { onMount } from 'svelte';
	
	let { current = 'home', active = 'home', hide = () => {}, updateDebug = () => {}, close = null } = $props();

	onMount(() => {
		console.log(`MobileNavigationItem: Component mounted for ${current}`);
		updateDebug('mounted', current);
		
		const targetId = current;
		const element = document.getElementById(targetId);
		updateDebug('onMountElement', element ? 'YES' : 'NO');
		
		// Check all sections
		const sections = document.querySelectorAll('.section');
		const sectionIds = Array.from(sections).map(el => el.id);
		updateDebug('sectionsFound', sectionIds.join(', '));
		
		// Check if the target section exists
		const targetSection = document.querySelector(`#${targetId}.section`);
		updateDebug('targetSection', targetSection ? 'YES' : 'NO');
	});

	const handleClick = () => {
		console.log(`MobileNavigationItem: Click event triggered for ${current}`);
		alert(`Click detected for ${current}!`); // Temporary debug alert
		updateDebug('clicked', current);
		
		// Simple hash navigation
		const targetId = current;
		const element = document.getElementById(targetId);
		
		updateDebug('targetId', targetId);
		updateDebug('elementFound', element ? 'YES' : 'NO');
		
		if (element) {
			updateDebug('elementTag', element.tagName);
			updateDebug('elementClasses', element.className);
			updateDebug('elementRect', `${element.getBoundingClientRect().top}px from top`);
			
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
				updateDebug('scrollResult', 'SUCCESS');
			} catch (error) {
				console.error(`MobileNavigationItem: Error scrolling to ${targetId}:`, error);
				updateDebug('scrollResult', `ERROR: ${error.message}`);
				
				// Fallback to instant scroll if smooth scroll fails
				element.scrollIntoView({ 
					behavior: 'auto', 
					block: 'start'
				});
				updateDebug('scrollResult', 'FALLBACK SUCCESS');
			}
		} else {
			console.log(`MobileNavigationItem: Element ${targetId} not found`);
			const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
			updateDebug('availableIds', allIds.join(', '));
			updateDebug('scrollResult', 'ELEMENT NOT FOUND');
		}
		
		// Close the mobile menu after scrolling completes
		setTimeout(() => {
			updateDebug('menuClosing', 'YES');
			hide();
		}, 500); // Increased delay to ensure scroll completes
	};
	
	// Function to handle both navigation and closing
	const handleNavigationClick = () => {
		// First handle the navigation
		handleClick();
		// Then close the popover immediately (Melt UI will handle the closing)
		if (close) {
			close();
		}
	};
</script>

<li>
	<button
		type="button"
		class="block w-full text-left py-3 px-2 {active == current ? 'text-green-400' : ''} cursor-pointer touch-manipulation select-none"
		on:click={handleNavigationClick}
		aria-label="Navigate to {current} section"
		role="menuitem"
	>
		{current}
	</button>
</li>
