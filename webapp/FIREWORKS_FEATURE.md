# Fireworks Feature

## Overview
The fireworks feature automatically displays a celebratory particle animation whenever the unallocated charges in the billing cycle reach zero dollars.

## How It Works

### Trigger Condition
- **When**: Unallocated charges total changes from a positive value to exactly $0.00
- **Where**: In the `getFilteredAllocationTotals()` function in the billing cycle page
- **How**: Monitors the `lastUnallocatedTotal` vs current unallocated total

### Fireworks Display
- **Duration**: 3 seconds
- **Effect**: Colorful particle animation covering the full screen
- **Colors**: Red, green, blue, yellow, magenta, cyan
- **Particles**: 150 animated particles with random sizes and movements

### Technical Implementation

#### Components
- **Fireworks.svelte**: Reusable fireworks component using tsParticles
- **Main Page**: Integrated into `[id]/+page.svelte` billing cycle page

#### State Management
```javascript
// Fireworks state
let showFireworks = $state(false);
let lastUnallocatedTotal = $state(0);
```

#### Trigger Logic
```javascript
// Check if unallocated charges reached zero and trigger fireworks
const unallocatedTotal = totals['__unallocated__'] || 0;
if (unallocatedTotal === 0 && lastUnallocatedTotal > 0) {
    showFireworks = true;
    // Hide fireworks after 3 seconds
    setTimeout(() => {
        showFireworks = false;
    }, 3000);
}
lastUnallocatedTotal = unallocatedTotal;
```

## Dependencies
- `@tsparticles/engine`: Core particle engine
- `@tsparticles/slim`: Lightweight particle system
- `@tsparticles/shape-text`: Text shape support

## Usage
The fireworks automatically trigger when:
1. User allocates all unallocated charges to budgets
2. User deletes charges that were previously unallocated
3. Any action that reduces unallocated charges to zero

## Customization
To modify the fireworks effect:
- Edit `webapp/src/lib/components/Fireworks.svelte`
- Adjust particle count, colors, speed, and animation parameters
- Change display duration in the main page logic

## Testing
To test the fireworks:
1. Navigate to a billing cycle with unallocated charges
2. Allocate charges until unallocated total reaches $0.00
3. Watch for the fireworks animation
4. Check browser console for debug messages