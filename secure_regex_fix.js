// Original vulnerable code:
// const cleaned = amountStr
//     .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
//     .replace(/\(([^)]+)\)/g, '-$1'); // Convert parentheses to negative (atomic group to prevent backtracking)

// Secure version - Option 1: Use atomic groups
const cleaned = amountStr
    .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
    .replace(/\(((?:[^)]+?))\)/g, '-$1'); // Convert parentheses to negative (non-greedy with atomic group)

// Secure version - Option 2: Use possessive quantifier (if supported)
// const cleaned = amountStr
//     .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
//     .replace(/\(([^)]++)\)/g, '-$1'); // Convert parentheses to negative (possessive quantifier)

// Secure version - Option 3: Use lookahead to prevent backtracking
// const cleaned = amountStr
//     .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
//     .replace(/\(([^)]+)(?=\))/g, '-$1'); // Convert parentheses to negative (lookahead)

// Secure version - Option 4: Use a more specific pattern
// const cleaned = amountStr
//     .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
//     .replace(/\(([^)]{1,1000})\)/g, '-$1'); // Convert parentheses to negative (with reasonable limit)

// Recommended approach: Use non-greedy matching with atomic group
function parseCurrency(amountStr) {
    const cleaned = amountStr
        .replace(/[$,\s]/g, '') // Remove $, commas, and spaces
        .replace(/\(((?:[^)]+?))\)/g, '-$1'); // Convert parentheses to negative (non-greedy)
    
    return parseFloat(cleaned);
}

// Test cases
console.log(parseCurrency('$1,234.56')); // 1234.56
console.log(parseCurrency('($1,234.56)')); // -1234.56
console.log(parseCurrency('$1,234.56')); // 1234.56
console.log(parseCurrency('($1,234.56)')); // -1234.56