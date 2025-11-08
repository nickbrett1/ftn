# Utility Functions

This directory contains **generic utility functions** that can be safely used anywhere in the application (both client and server-side).

## parsing-utils.js

Provides shared parsing utilities for credit card statement parsing, eliminating duplication across different services.

### Functions

#### `parseJSONResponse(content, options)`

Parse JSON response from API with error handling and markdown cleaning.

**Parameters:**

- `content` (string): Raw JSON content
- `options` (object): Parsing options
  - `cleanMarkdown` (boolean): Whether to clean markdown formatting (default: true)

**Returns:** Parsed JSON object

#### `validateParsedData(data, requiredFields, options)`

Validate parsed data against required fields.

**Parameters:**

- `data` (object): Parsed data to validate
- `requiredFields` (array): Array of required field names
- `options` (object): Validation options
  - `strict` (boolean): Whether to throw error on missing fields (default: false)

**Returns:** Boolean indicating if data is valid

#### `parseAmount(amountStr, options)`

Parse an amount string and convert to number.

**Parameters:**

- `amountStr` (string): Amount string (e.g., "123.45", "-123.45", "$1,234.56")
- `options` (object): Parsing options
  - `defaultValue` (number): Default value if parsing fails (default: 0)
  - `allowNegative` (boolean): Whether to allow negative amounts (default: true)

**Returns:** Parsed amount as number

#### `parseDate(dateStr, options)`

Parse date strings in various formats.

**Parameters:**

- `dateStr` (string): Date string to parse
- `options` (object): Parsing options
  - `defaultYear` (number): Default year for 2-digit years (default: current year)

**Returns:** Date in YYYY-MM-DD format

#### `cleanMerchantName(merchantName, options)`

Clean and normalize merchant names.

**Parameters:**

- `merchantName` (string): Raw merchant name
- `options` (object): Cleaning options
  - `removeCommonSuffixes` (boolean): Remove common suffixes (default: true)
  - `normalizeCase` (boolean): Normalize case (default: true)

**Returns:** Cleaned merchant name

### Usage Examples

```javascript
import { ParsingUtils } from '$lib/utils/parsing-utils.js';

// Parse JSON response
const data = ParsingUtils.parseJSONResponse(jsonString);

// Validate parsed data
const isValid = ParsingUtils.validateParsedData(data, ['last4', 'statement_date']);

// Parse amounts
const amount = ParsingUtils.parseAmount('$1,234.56'); // Returns 1234.56

// Parse dates
const date = ParsingUtils.parseDate('12/25/23'); // Returns '2023-12-25'
```

## regex-validator.js

Provides utility functions for safe regex validation and testing, preventing ReDoS (Regular Expression Denial of Service) attacks.

## ccbilling-parsers/

Provides generic credit card statement parsing utilities that can be used on both client and server-side.

### Files

#### `base-parser.js`

Base class for credit card statement parsers with common functionality.

**Key Methods:**

- `parseDate(dateStr, options)` - Parse date strings using shared utilities
- `parseAmount(amountStr, options)` - Parse amount strings using shared utilities
- `parseJSONResponse(content, options)` - Parse JSON responses using shared utilities
- `cleanMerchantName(merchantName, options)` - Clean merchant names using shared utilities
- `validateParsedData(data, requiredFields, options)` - Validate parsed data

#### `chase-parser.js`

Chase Bank credit card statement parser.

**Key Methods:**

- `canParse(text)` - Check if this parser can handle the given statement
- `parse(pdfText)` - Parse Chase statement and extract required information
- `extractLast4Digits(text)` - Extract the last 4 digits of the credit card
- `extractStatementDate(text)` - Extract the statement closing date
- `extractCharges(text)` - Extract charges from the statement

#### `parser-factory.js`

Factory for creating appropriate statement parsers.

**Key Methods:**

- `detectParser(text)` - Detect the appropriate parser for a given statement
- `parseStatement(text)` - Parse a statement using the appropriate parser
- `getSupportedProviders()` - Get list of supported providers

### Usage Examples

```javascript
import { ParserFactory } from '$lib/utils/ccbilling-parsers/parser-factory.js';
import { ChaseParser } from '$lib/utils/ccbilling-parsers/chase-parser.js';

// Use factory to auto-detect parser
const factory = new ParserFactory();
const parsedData = await factory.parseStatement(pdfText);

// Use specific parser
const chaseParser = new ChaseParser();
if (chaseParser.canParse(pdfText)) {
	const data = await chaseParser.parse(pdfText);
}
```

### Functions

#### `isRegexSafe(pattern, testString, timeout)`

Test if a regex pattern is safe from ReDoS attacks.

**Parameters:**

- `pattern` (string): The regex pattern to test
- `testString` (string): A string that should match the pattern
- `timeout` (number): Timeout in milliseconds (default: 1000)

**Returns:** Boolean indicating if pattern is safe

#### `createSafeDateRegex(format)`

Create a safe regex for date validation.

#### `createSafeCurrencyRegex()`

Create a safe regex for currency validation.

#### `createSafeCardNumberRegex()`

Create a safe regex for card number validation.

#### `createSafeBillingCycleRegex()`

Create a safe regex for billing cycle validation.

### Usage Examples

```javascript
import { isRegexSafe, createSafeDateRegex } from '$lib/utils/regex-validator.js';

// Test regex safety
const isSafe = await isRegexSafe(/^(\d{4})-(\d{2})-(\d{2})$/, '2023-12-25');

// Create safe date regex
const dateRegex = createSafeDateRegex('YYYY-MM-DD');
```

## Client-Side Utilities

**Note:** Client-side utilities that require browser APIs have been moved to `$lib/client/`:

- `particleConfig.js` - Particle effects using tsParticles
- `google-auth.js` - Google OAuth authentication
- `pdf-utils.js` - PDF processing utilities

These utilities use browser-specific APIs and should be imported from `$lib/client/` instead of `$lib/utils/`.

### Testing

Unit tests are available for all utilities:

- `parsing-utils.test.js`
- `regex-validator.test.js`
- `ccbilling-parsers/base-parser.test.js`
- `ccbilling-parsers/chase-parser.test.js`
- `ccbilling-parsers/parser-factory.test.js`
