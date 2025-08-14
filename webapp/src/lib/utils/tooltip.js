// Tooltip utility for 3D heatmap
export function createTooltip() {
	// Check if tooltip already exists
	let tooltip = document.getElementById('heatmap-tooltip');
	
	if (!tooltip) {
		// Create tooltip element
		tooltip = document.createElement('div');
		tooltip.id = 'heatmap-tooltip';
		tooltip.className = 'fixed pointer-events-none z-50 hidden bg-black bg-opacity-90 text-white p-3 rounded-lg border border-zinc-700 shadow-lg';
		tooltip.style.cssText = `
			position: fixed;
			z-index: 1000;
			pointer-events: none;
			display: none;
			max-width: 250px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 12px;
			line-height: 1.4;
		`;
		
		// Add to document
		document.body.appendChild(tooltip);
	}
	
	return tooltip;
}

// Position tooltip relative to mouse
export function positionTooltip(tooltip, event) {
	if (!tooltip) return;
	
	const rect = tooltip.getBoundingClientRect();
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	
	let left = event.clientX + 10;
	let top = event.clientY - 10;
	
	// Adjust if tooltip would go off-screen
	if (left + rect.width > viewportWidth) {
		left = event.clientX - rect.width - 10;
	}
	
	if (top + rect.height > viewportHeight) {
		top = event.clientY - rect.height - 10;
	}
	
	// Ensure tooltip stays within viewport bounds
	left = Math.max(10, Math.min(left, viewportWidth - rect.width - 10));
	top = Math.max(10, Math.min(top, viewportHeight - rect.height - 10));
	
	tooltip.style.left = left + 'px';
	tooltip.style.top = top + 'px';
}

// Show tooltip with content
export function showTooltip(tooltip, content, event) {
	if (!tooltip) return;
	
	tooltip.innerHTML = content;
	tooltip.style.display = 'block';
	positionTooltip(tooltip, event);
}

// Hide tooltip
export function hideTooltip(tooltip) {
	if (!tooltip) return;
	
	tooltip.style.display = 'none';
}