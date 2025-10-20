// Test the new merchant normalization patterns
import { normalizeMerchant } from './webapp/src/lib/utils/merchant-normalizer.js';

// Test cases from the user's examples
const testCases = [
	// Store number variations
	'PINKBERRY 15012 NEW YORK',
	'PINKBERRY 15038 NEW YORK',
	
	// Spacing variations
	'PLANT SHED 87 CORP NEW YORK',
	'PLANTSHED 8007539595',
	
	// Address format variations
	'TST* DIG INN- 100 W 67 NEW YORK',
	'TST* DIG INN- 100 W 67TH NEW YORK',
	
	// Apple variations
	'APPLE STORE',
	'ITUNES STORE',
	'APPLE.COM/BILL'
];

console.log('Testing new merchant normalization patterns:');
console.log('==========================================');

testCases.forEach(merchant => {
	const result = normalizeMerchant(merchant);
	console.log(`\nInput: "${merchant}"`);
	console.log(`Normalized: "${result.merchant_normalized}"`);
	console.log(`Details: "${result.merchant_details}"`);
});
