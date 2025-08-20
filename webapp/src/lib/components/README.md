# Global Financial Centers Earth Component

## Overview
The `DynamicMarketGlobe` is a 3D interactive Earth visualization that showcases key financial centers around the world where you've worked and operated. It replaces the previous orbiting instruments concept with a more geographically meaningful and impressive representation.

## Features

### 🌍 **Core Functionality**
- **Realistic Earth Globe**: Textured Earth sphere with proper geographic positioning
- **Financial Center Markers**: Interactive markers placed at exact geographic coordinates
- **Dynamic Market Data**: Real-time sentiment and market indicators for each center
- **Celestial Elements**: Sun, stars, and atmospheric lighting for dramatic effect

### 🏦 **Financial Centers Featured**
- **New York** (Tier 1) - World's largest financial center, Wall Street
- **London** (Tier 1) - Europe's leading hub, major forex trading
- **Hong Kong** (Tier 2) - Asia-Pacific gateway, major IPO destination
- **Tokyo** (Tier 2) - Asia's largest stock market, banking center
- **Singapore** (Tier 2) - Southeast Asia hub, major forex center
- **Dubai** (Tier 3) - Middle East center, Islamic finance hub
- **São Paulo** (Tier 3) - Latin America's largest financial center
- **Mumbai** (Tier 3) - India's financial capital, stock exchange hub
- **Sydney** (Tier 3) - Oceania's hub, commodity trading center

### 🎨 **Visual Design**
- **Earth Textures**: Realistic Earth surface mapping
- **Celestial Lighting**: Sun with glow effects and starfield background
- **Dynamic Markers**: Pulsing cones with color-coded sentiment
- **Market Indicators**: Floating spheres showing live market data
- **Professional Atmosphere**: Deep space background with dramatic lighting

### 🚀 **Technical Features**
- **Three.js Integration**: Built with @threlte/core and @threlte/extras
- **Geographic Accuracy**: Precise lat/lng to 3D coordinate conversion
- **Interactive Tooltips**: Rich market data displays on hover
- **Performance Optimized**: Efficient rendering with proper cleanup
- **Fallback Support**: 2D representation if 3D rendering fails

## Components

### DynamicMarketGlobe.svelte
Main component featuring:
- Earth globe with realistic textures
- Sun and stars background
- Financial center marker placement
- Camera and lighting setup

### FinancialCenterMarker.svelte
Individual financial center representation with:
- Geographic positioning on Earth surface
- Pulsing cone markers with sentiment colors
- Market data indicators floating above
- Interactive tooltips with detailed information

### MarketLegend.svelte
Updated legend showing:
- Market sentiment indicators
- Financial center importance tiers
- Market type color coding
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

Each financial center has the following properties:
```typescript
interface FinancialCenter {
  name: string;           // City name (e.g., 'New York', 'London')
  country: string;        // Country name
  latitude: number;       // Geographic latitude
  longitude: number;      // Geographic longitude
  timezone: string;       // Time zone abbreviation
  markets: string[];      // Key markets (NYSE, LSE, etc.)
  marketSentiment: number; // Market sentiment percentage
  importance: number;     // Tier level (1-3)
  description: string;    // Brief description
}
```

## Geographic Positioning

The component automatically converts latitude and longitude coordinates to 3D positions on the Earth sphere:
- **Latitude**: North/South positioning (Y-axis)
- **Longitude**: East/West positioning (X and Z axes)
- **Radius**: Slightly larger than Earth for marker visibility

## Customization

### Colors
- Positive sentiment: Green (#00ff88)
- Negative sentiment: Red (#ff0088)
- Different importance tiers have distinct visual representations

### Animation
- Marker pulse intensity and timing
- Earth auto-rotation speed
- Sun glow effects
- Star field density

### Data
- Financial center data is generated in `financialCentersData.js`
- Easy to add new centers or modify existing ones
- Support for real-time updates (future enhancement)

## Browser Compatibility
- Requires WebGL support
- Modern browsers with ES6+ support
- Graceful fallback to 2D representation if 3D fails

## Performance Considerations
- Efficient Earth rendering with optimized geometry
- Smart marker positioning and rendering
- Responsive to device capabilities
- Memory management for tooltips and animations

## Future Enhancements
- Real-time market data integration
- Weather effects and time-of-day lighting
- Interactive region selection
- Market trend visualization
- Currency exchange rate displays