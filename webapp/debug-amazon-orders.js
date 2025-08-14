import { extractAmazonOrderId } from './src/lib/server/amazon-orders-service.js';

// Test cases for Amazon order ID extraction
const testCases = [
    'AMAZON.COM*123-4567890-1234567',
    'AMZN.COM/BILL 987-6543210-9876543',
    'Amazon.com 1234567890123456',
    'AMAZON.COM*987-6543210-9876543',
    'AMZN.COM/BILL 123-4567890-1234567',
    'Amazon.com 9876543210987654',
    'AMAZON.COM*111-2223333-4445555',
    'AMZN.COM/BILL 555-6667777-8889999',
    'Amazon.com 1111111111111111',
    'AMAZON.COM*999-8887777-6665555',
    'AMZN.COM/BILL 777-6665555-4443333',
    'Amazon.com 9999999999999999'
];

console.log('Testing Amazon Order ID Extraction:');
console.log('==================================');

testCases.forEach((merchantString, index) => {
    const orderId = extractAmazonOrderId(merchantString);
    console.log(`${index + 1}. "${merchantString}"`);
    console.log(`   Extracted Order ID: ${orderId || 'null'}`);
    console.log('');
});

// Test edge cases
console.log('Edge Cases:');
console.log('===========');

const edgeCases = [
    'AMAZON.COM*123-4567890-1234567 EXTRA TEXT',
    'AMZN.COM/BILL 987-6543210-9876543 (PENDING)',
    'Amazon.com 1234567890123456 - Digital Purchase',
    'AMAZON.COM*111-2223333-4445555*',
    'AMZN.COM/BILL 555-6667777-8889999.',
    'Amazon.com 9999999999999999!'
];

edgeCases.forEach((merchantString, index) => {
    const orderId = extractAmazonOrderId(merchantString);
    console.log(`${index + 1}. "${merchantString}"`);
    console.log(`   Extracted Order ID: ${orderId || 'null'}`);
    console.log('');
});