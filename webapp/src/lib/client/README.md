# Client-Side Utilities

This directory contains **client-side utility functions** that require browser APIs and can only run in the browser environment.

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
} from '$lib/client/particleConfig.js';

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

## google-auth.js

Provides Google OAuth authentication utilities for the client-side application.

### Functions

#### `getRedirectUri()`

Get the appropriate redirect URI based on environment.

**Returns:** Redirect URI string for development or production

#### `initiateGoogleAuth(redirectPath)`

Initiate Google OAuth flow using the Google Identity Services library.

**Parameters:**
- `redirectPath` (string): Optional path to redirect to after successful auth (defaults to '/projects/ccbilling')

**Returns:** Promise that resolves when auth flow is initiated

### Usage Examples

```javascript
import { initiateGoogleAuth } from '$lib/client/google-auth.js';

// Basic usage
await initiateGoogleAuth();

// With custom redirect
await initiateGoogleAuth('/dashboard');
```

## pdf-utils.js

Provides PDF processing utilities for client-side PDF parsing and text extraction.

## ccbilling-pdf-service.js

Service for parsing credit card statements using PDF.js on the client-side.

### Functions

#### `parseStatement(pdfFile)`

Parse a PDF file and extract statement information.

**Parameters:**
- `pdfFile` (File): PDF file from input

**Returns:** Promise<Object> - Parsed statement data

#### `getSupportedProviders()`

Get list of supported credit card providers.

**Returns:** Array - Array of supported provider names

### Usage Examples

```javascript
import { PDFService } from '$lib/client/ccbilling-pdf-service.js';

const pdfService = new PDFService();
const parsedData = await pdfService.parseStatement(pdfFile);
const providers = pdfService.getSupportedProviders();
```

### Functions

#### `configureWorker()`

Configure PDF.js worker for browser environment.

#### `extractTextFromPDF(pdfDocument, options)`

Extract text content from all pages of a PDF document.

**Parameters:**
- `pdfDocument` (object): PDF.js document object
- `options` (object): Extraction options
  - `sortByPosition` (boolean): Whether to sort text by position (default: true)
  - `groupByLine` (boolean): Whether to group text by line (default: true)

**Returns:** Promise<string> - Combined text from all pages

#### `parsePDFFile(pdfFile, options)`

Parse a PDF file and extract text content.

**Parameters:**
- `pdfFile` (File|Buffer): PDF file or buffer
- `options` (object): Parsing options

**Returns:** Promise<string> - Extracted text content

#### `parseStatement(pdfFile, parserFactory, options)`

Parse a credit card statement PDF using the appropriate parser.

**Parameters:**
- `pdfFile` (File): PDF file to parse
- `parserFactory` (function): Factory function to create parser instances
- `options` (object): Parsing options

**Returns:** Promise<object> - Parsed statement data

### Usage Examples

```javascript
import { PDFUtils } from '$lib/client/pdf-utils.js';

// Configure worker
PDFUtils.configureWorker();

// Parse PDF file
const text = await PDFUtils.parsePDFFile(pdfFile);

// Parse statement
const statement = await PDFUtils.parseStatement(pdfFile, parserFactory);
```

## Browser Dependencies

These utilities require the following browser APIs:

- **particleConfig.js**: `crypto.getRandomValues()`, DOM manipulation
- **google-auth.js**: `document.cookie`, `window.google`, DOM manipulation
- **pdf-utils.js**: `window`, PDF.js library, File API

## Testing

Unit tests are available for all utilities:
- `particleConfig.test.js`
- `google-auth.test.js`
- `pdf-utils.test.js`

## Migration Notes

These utilities were moved from `$lib/utils/` to `$lib/client/` to better organize code by environment requirements. Update your imports accordingly:

```javascript
// Old imports (no longer work)
import { createFinancialParticleConfig } from '$lib/utils/particleConfig.js';
import { initiateGoogleAuth } from '$lib/utils/google-auth.js';
import { PDFUtils } from '$lib/utils/pdf-utils.js';

// New imports
import { createFinancialParticleConfig } from '$lib/client/particleConfig.js';
import { initiateGoogleAuth } from '$lib/client/google-auth.js';
import { PDFUtils } from '$lib/client/pdf-utils.js';
import { PDFService } from '$lib/client/ccbilling-pdf-service.js';
```