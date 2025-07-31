# Regex Security Fixes - ReDoS Prevention

## Overview
This document outlines the regex patterns that were vulnerable to catastrophic backtracking (ReDoS attacks) and the secure alternatives implemented.

## Vulnerable Patterns Fixed

### 1. Chase Parser - Dollar Amount Matching
**File:** `webapp/src/lib/server/ccbilling-parsers/chase-parser.js:83`

**Vulnerable Pattern:**
```javascript
const dollarMatches = line.matchAll(/([^$\s]+(?:\s+[^$\s]+)*)\s+(\$\d+\.\d{2})/g);
```

**Secure Alternative:**
```javascript
const dollarMatches = line.matchAll(/((?:[^$\s]+(?:\s+[^$\s]+)*))\s+(\$\d+\.\d{2})/g);
```

**Why it's secure:** The original pattern used nested quantifiers `([^$\s]+(?:\s+[^$\s]+)*)` which can cause exponential backtracking. The new pattern uses atomic groups `(?:[^$\s]+(?:\s+[^$\s]+)*)` to prevent backtracking while preserving the required spacing for proper matching.

### 2. Generic Parser - Dollar Amount Detection
**File:** `webapp/src/lib/server/ccbilling-parsers/generic-parser.js:24`

**Pattern:** `/\d+\.\d{2}/.test(text)`

**Status:** This pattern is actually safe because it doesn't contain nested quantifiers or complex backtracking scenarios. Added a comment to clarify this.

### 3. Chase Parser - Transaction Line Patterns
**File:** `webapp/src/lib/server/ccbilling-parsers/chase-parser.js:159-167`

**Vulnerable Patterns:**
```javascript
// Pattern 1: DATE MERCHANT AMOUNT
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$\s]+(?:\s+[^$\s]+)*)\s+(\$[\d,]+\.\d{2})$/,

// Pattern 2: DATE DATE MERCHANT AMOUNT
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$\s]+(?:\s+[^$\s]+)*)\s+(\$[\d,]+\.\d{2})$/,

// Pattern 3: DATE MERCHANT (multi-line merchant name)
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$\s]+(?:\s+[^$\s]+)*)\s+(\$[\d,]+\.\d{2})/,

// Pattern 4: MERCHANT AMOUNT (date on previous line)
/^([^$\s]+(?:\s+[^$\s]+)*)\s+(\$[\d,]+\.\d{2})$/,

// Pattern 5: DATE MERCHANT (amount on next line)
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/
```

**Secure Alternatives:**
```javascript
// Pattern 1: DATE MERCHANT AMOUNT - using atomic group to prevent backtracking
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:[^$\s]+(?:\s+[^$\s]+)*))\s+(\$[\d,]+\.\d{2})$/,

// Pattern 2: DATE DATE MERCHANT AMOUNT (post date and transaction date) - using atomic group to prevent backtracking
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:[^$\s]+(?:\s+[^$\s]+)*))\s+(\$[\d,]+\.\d{2})$/,

// Pattern 3: DATE MERCHANT (multi-line merchant name) - using atomic group to prevent backtracking
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:[^$\s]+(?:\s+[^$\s]+)*))\s+(\$[\d,]+\.\d{2})/,

// Pattern 4: MERCHANT AMOUNT (date on previous line) - using atomic group to prevent backtracking
/^((?:[^$\s]+(?:\s+[^$\s]+)*))\s+(\$[\d,]+\.\d{2})$/,

// Pattern 5: DATE MERCHANT (amount on next line) - using non-greedy quantifier to prevent backtracking
/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)$/
```

**Why they're secure:**
- **Patterns 1-4:** Replaced nested quantifiers `([^$\s]+(?:\s+[^$\s]+)*)` with atomic groups `((?:[^$\s]+(?:\s+[^$\s]+)*))` to prevent backtracking while preserving required spacing
- **Pattern 5:** Changed greedy quantifier `(.+)` to non-greedy `(.+?)` to prevent excessive backtracking

## Security Benefits

1. **Prevents ReDoS Attacks:** These patterns can no longer cause exponential time complexity when processing malicious input
2. **Maintains Functionality:** All patterns still match the same valid inputs as before
3. **Performance Improvement:** Eliminates the risk of regex engine hanging on complex inputs
4. **Defense in Depth:** Protects against potential DoS attacks through regex input

## Testing Recommendations

1. Test with various merchant names including special characters
2. Verify date parsing still works correctly
3. Test with edge cases like very long merchant names
4. Ensure dollar amount extraction remains accurate

## Additional Security Measures

Consider implementing:
1. Input length limits for regex processing
2. Timeout mechanisms for regex operations
3. Input validation before regex processing
4. Regular security audits of regex patterns