<script>
	let { current = 'home', active = 'home', hide = () => {} } = $props();

	const handleClick = (event) => {
		console.log(`MobileNavigationItem: Click event triggered for ${current}`);
		
		event.preventDefault();
		event.stopPropagation();
		
		// Close the mobile menu
		hide();
		
		// Simple hash navigation
		const targetId = current;
		const element = document.getElementById(targetId);
		
		if (element) {
			console.log(`MobileNavigationItem: Scrolling to ${targetId}`);
			element.scrollIntoView({ 
				behavior: 'smooth', 
				block: 'start'
			});
			
			// Update URL hash
			window.history.pushState(null, '', `#${targetId}`);
		} else {
			console.log(`MobileNavigationItem: Element ${targetId} not found`);
		}
	};
</script>

<li>
	<a
		href="/#{current}"
		class="block py-2 {active == current ? 'text-green-400' : ''}"
		onclick={() => {
			hide();
		}}
	>
		{current}
	</a>
</li>
