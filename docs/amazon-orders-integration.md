# Amazon Orders Integration for Credit Card Billing

## Overview

This integration solves the problem of mapping Amazon charges on credit card statements back to the actual items purchased. When reviewing credit card statements, Amazon charges typically show only an order identifier with no details about what was actually bought. This integration automatically extracts those order IDs and provides click-out links to view the complete order details on Amazon.

## How It Works

### 1. Order ID Detection

When a credit card statement is parsed, the system automatically detects Amazon charges by looking for patterns like:

- `AMAZON.COM*123-4567890-1234567`
- `AMZN.COM/BILL 987-6543210-9876543`
- `Amazon.com 1234567890123456`

### 2. Click-Out to Amazon

The system extracts the order ID from the merchant string and generates:

- Direct links to Amazon order details pages
- Seamless integration with Amazon's native order viewing

### 3. Budget Categorization

For any previously cached order data, the system can:

- Automatically categorize items into appropriate budget categories
- Split a single Amazon charge across multiple budgets
- Provide accurate spending insights

## Architecture

```
┌─────────────────────┐
│ Credit Card         │
│ Statement Parser    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Amazon Order ID     │
│ Extractor           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Click-Out Links     │────▶│ Amazon.com          │
│ Generator           │     │ (Native Order View) │
└──────────┬──────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Cache Layer         │
│ (D1 Database)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UI Component        │
│ (Order Links)       │
└─────────────────────┘
```

## Setup Instructions

### 1. No External Worker Required

The new integration approach doesn't require deploying a separate Cloudflare Worker. All functionality is built into the main application.

### 2. Configure the Main Application

The system automatically generates Amazon order URLs using the standard format:
- Order details: `https://www.amazon.com/gp/your-account/order-details?orderID={ORDER_ID}`
- Search fallback: `https://www.amazon.com/s?k={ORDER_ID}`

### 3. Environment Variables

No additional environment variables are required for the Amazon integration. The system works with your existing database configuration.

## API Endpoints

### GET /projects/ccbilling/charges/[id]/amazon-details

Returns Amazon order information and click-out links for a specific charge.

**Response:**
```json
{
  "success": true,
  "charge": {
    "id": 123,
    "merchant": "AMAZON.COM*123-4567890-1234567",
    "amount": 29.99,
    "date": "2024-01-15",
    "allocated_to": "Electronics"
  },
  "order_id": "123-4567890-1234567",
  "order_info": {
    "order_id": "123-4567890-1234567",
    "order_url": "https://www.amazon.com/gp/your-account/order-details?orderID=123-4567890-1234567",
    "message": "Click the link above to view your order details on Amazon",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "suggested_categories": {},
  "message": "Click the Amazon order link above to view your order details on Amazon"
}
```

### POST /projects/ccbilling/charges/[id]/amazon-details

Refreshes Amazon order information for a specific charge.

## Usage Examples

### Frontend Integration

```javascript
// Get Amazon order information
const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`);
const data = await response.json();

if (data.success && data.order_info) {
  const { order_url } = data.order_info;
  
  // Display click-out links
  const orderLink = document.createElement('a');
  orderLink.href = order_url;
  orderLink.textContent = 'View Order on Amazon';
  orderLink.target = '_blank';
}
```

### Order ID Extraction

```javascript
import { extractAmazonOrderId } from '$lib/server/amazon-orders-service.js';

const merchantString = "AMAZON.COM*123-4567890-1234567";
const orderId = extractAmazonOrderId(merchantString);
// Returns: "123-4567890-1234567"
```

## Benefits of the New Approach

1. **Simplified Architecture**: No external worker to maintain or deploy
2. **Direct Integration**: Users click through to Amazon's native order view
3. **No Authentication Issues**: Leverages Amazon's existing user authentication
4. **Real-time Data**: Always shows the most current order information
5. **Reduced Complexity**: Fewer moving parts and potential failure points
6. **Better User Experience**: Familiar Amazon interface for order details

## Migration from Worker-Based Approach

If you were previously using the Amazon Orders Worker:

1. **Remove Worker**: The `amazon-orders-worker/` directory has been removed
2. **Update Imports**: The service now exports different functions
3. **Update API Calls**: Frontend should expect `order_info` instead of `order_details`
4. **Environment Variables**: Remove `AMAZON_ORDERS_WORKER_URL` and related configs

## Future Enhancements

The system maintains the database caching infrastructure, so you can:

- Store order metadata for offline access
- Track order history and patterns
- Implement budget categorization for cached items
- Add analytics on Amazon spending patterns

## Troubleshooting

### Common Issues

1. **Order ID Not Found**: Ensure the merchant string contains valid Amazon order ID patterns
2. **Invalid URLs**: Check that order IDs are properly formatted
3. **Cached Data**: Clear database cache if you encounter stale information

### Debug Mode

Enable debug logging to see order ID extraction details:

```javascript
console.log('Merchant:', charge.merchant);
console.log('Extracted Order ID:', extractAmazonOrderId(charge.merchant));
```
