# Utility Functions

This directory contains reusable utility functions for the application.

## particleConfig.js

Provides configurable particle effects using tsParticles for creating animated backgrounds.

### Functions

#### `generatePercentageValues(count, positive)`

Generates cryptographically secure random percentage values for financial-themed particles.

**Security Note:** Uses `crypto.getRandomValues()` for cryptographically secure random number generation, following security best practices.

**Parameters:**
- `count` (number): Number of values to generate (default: 50)
- `positive` (boolean): Whether to generate positive (+) or negative (-) values (default: true)

**Returns:** Array of formatted percentage strings (e.g., `["+5.23%", "+12.10%"]`) for display only

#### `createFinancialParticleConfig(overrides)`

Creates a financial-themed particle configuration with dynamic percentage text particles.

**Features:**
- Green particles for positive percentages
- Red particles for negative percentages
- Upward movement direction
- Random link colors

**Parameters:**
- `overrides` (object): Configuration overrides to merge with base config

**Returns:** Complete tsParticles configuration object

#### `createErrorParticleConfig(overrides)`

Creates an error page particle configuration with "404" and "ERROR" text particles.

**Features:**
- Green "404" text particles
- Red "ERROR" text particles
- No movement direction (stationary drift)
- Fewer particles for less distraction

**Parameters:**
- `overrides` (object): Configuration overrides to merge with base config

**Returns:** Complete tsParticles configuration object

### Usage Examples

```javascript
import { 
  createFinancialParticleConfig, 
  createErrorParticleConfig 
} from '$lib/utils/particleConfig.js';

// Basic usage
const config = createFinancialParticleConfig();

// With customizations
const customConfig = createFinancialParticleConfig({
  fpsLimit: 30,
  particles: {
    number: { value: 10 },
    move: { speed: 2 }
  }
});

// Error page configuration
const errorConfig = createErrorParticleConfig();
```

### Implementation

Both configurations share a common base configuration and use deep merging to allow for flexible customization while preserving default settings.

The utility eliminates code duplication and provides a consistent API for particle effects across the application.

**Important Note:** The financial particle configuration intentionally uses the baseConfig links properties (distance: 400, opacity: 0.2) to match the original Background.svelte behavior, where duplicate links properties caused the second definition to override the first.

### Testing

Unit tests are available in `particleConfig.test.js` covering:
- Percentage value generation
- Configuration structure validation
- Override functionality
- Deep merge behavior