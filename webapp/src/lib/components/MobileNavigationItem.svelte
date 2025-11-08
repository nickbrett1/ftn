<script>
	let { current = 'home', active = 'home', close = null, hide = () => {} } = $props();

	const handleClick = () => {
		// Simple hash navigation
		const targetId = current;
		const element = document.getElementById(targetId);

		if (element) {
			// Scroll to the element
			element.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});

			// Update URL hash
			window.history.pushState(null, '', `#${targetId}`);
		}

		// Close the mobile menu immediately
		hide();
	};
</script>

<li>
	<button
		type="button"
		class="block w-full text-left py-3 px-2 {active == current
			? 'text-green-400'
			: ''} cursor-pointer touch-manipulation select-none"
		onclick={handleClick}
		aria-label="Navigate to {current} section"
		role="menuitem"
	>
		{current}
	</button>
</li>
