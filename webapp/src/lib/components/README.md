# Dynamic Market Data Globe Component

## Overview
The `DynamicMarketGlobe` is a 3D interactive visualization component that replaces the previous heatmap with a more dynamic and engaging representation of global financial markets.

## Features

### 🎯 **Core Functionality**
- **3D Globe Visualization**: Central wireframe sphere representing the market core
- **Orbiting Instruments**: Financial instruments orbit around the central sphere at different levels and speeds
- **Dynamic Animations**: Continuous movement with pulsing effects and orbital paths
- **Interactive Tooltips**: Hover over instruments to see detailed market information

### 🏦 **Financial Instruments**
- **Stocks**: Major tech, financial, healthcare, and industrial companies
- **Bonds**: Government and corporate bonds with different maturities
- **Cryptocurrencies**: Major digital assets like Bitcoin, Ethereum, Solana
- **Forex**: Major currency pairs (EUR/USD, GBP/USD, USD/JPY, etc.)
- **Commodities**: Gold, silver, oil, copper futures

### 🎨 **Visual Design**
- **Neon Theme**: Glowing effects with cyan, magenta, and green accents
- **Dynamic Lighting**: Multiple colored point lights for dramatic atmosphere
- **Material Effects**: Metallic surfaces with emissive properties
- **Wireframe Elements**: Central sphere uses wireframe geometry for tech aesthetic

### 🚀 **Technical Features**
- **Three.js Integration**: Built with @threlte/core and @threlte/extras
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Performance Optimized**: Efficient rendering with proper cleanup
- **Fallback Support**: 2D representation if 3D rendering fails

## Components

### DynamicMarketGlobe.svelte
Main component that orchestrates the 3D scene, camera, lighting, and data management.

### MarketDataPoint.svelte
Individual instrument representation with:
- Unique geometries for different instrument types
- Orbital movement patterns
- Pulsing animations
- Interactive tooltips

### MarketLegend.svelte
Collapsible legend showing:
- Instrument type indicators
- Performance color coding
- Size/volume explanations
- User interaction tips

## Usage

```svelte
<script>
  import DynamicMarketGlobe from '$lib/components/DynamicMarketGlobe.svelte';
</script>

<div class="w-full h-[80vh]">
  <DynamicMarketGlobe />
</div>
```

## Data Structure

Each instrument has the following properties:
```typescript
interface MarketInstrument {
  symbol: string;        // Trading symbol (e.g., 'AAPL', 'BTC')
  name: string;          // Full company/asset name
  type: string;          // Instrument type ('Stock', 'Bond', 'Crypto', 'Forex')
  price: number;         // Current price
  priceChange: number;   // Percentage change
  volume: number;        // Trading volume
}
```

## Customization

### Colors
- Positive changes: Green (#00ff88)
- Negative changes: Red (#ff0088)
- Different instrument types have distinct visual representations

### Animation
- Orbit speeds and radii can be adjusted in `MarketDataPoint.svelte`
- Pulse intensity and timing can be modified
- Camera auto-rotation speed is configurable

### Data
- Market data is generated in `marketDataGenerator.js`
- Easy to add new instrument types or modify existing ones
- Support for real-time data updates (future enhancement)

## Browser Compatibility
- Requires WebGL support
- Modern browsers with ES6+ support
- Graceful fallback to 2D representation if 3D fails

## Performance Considerations
- Efficient rendering with proper cleanup
- Optimized for 60fps animations
- Responsive to device capabilities
- Memory management for tooltips and animations