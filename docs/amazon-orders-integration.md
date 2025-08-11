# Amazon Orders Integration for Credit Card Billing

## Overview

This integration solves the problem of mapping Amazon charges on credit card statements back to the actual items purchased. When reviewing credit card statements, Amazon charges typically show only an order identifier with no details about what was actually bought. This integration automatically extracts those order IDs and fetches the complete order details from Amazon.

## How It Works

### 1. Order ID Detection

When a credit card statement is parsed, the system automatically detects Amazon charges by looking for patterns like:

- `AMAZON.COM*123-4567890-1234567`
- `AMZN.COM/BILL 987-6543210-9876543`
- `Amazon.com 1234567890123456`

### 2. Order Details Retrieval

The system extracts the order ID from the merchant string and uses the Amazon Orders Worker to:

- Fetch the complete order details from Amazon
- Retrieve item names, prices, and quantities
- Get order date and status information
- Cache the results for future reference

### 3. Budget Categorization

Once order details are retrieved, the system can:

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
│ Amazon Orders       │────▶│ Amazon.com          │
│ Worker (Python)     │     │ (via amazon-orders) │
└──────────┬──────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Cache Layer         │
│ (KV + D1 Database)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UI Component        │
│ (Order Details)     │
└─────────────────────┘
```

## Setup Instructions

### 1. Deploy the Amazon Orders Worker

```bash
cd amazon-orders-worker
npm install
./setup.sh  # Interactive setup script
```

Or manually:

```bash
# Install dependencies
npm install -g wrangler
pip install -r requirements.txt

# Create resources
wrangler kv:namespace create "AMAZON_CACHE"
wrangler d1 create amazon-orders-db

# Set credentials
wrangler secret put AMAZON_EMAIL
wrangler secret put AMAZON_PASSWORD

# Deploy
wrangler deploy
```

### 2. Configure the Main Application

Add the worker URL to your environment:

```bash
# In webapp/.env or wrangler.toml
AMAZON_ORDERS_WORKER_URL=https://amazon-orders-worker.your-subdomain.workers.dev
```

### 3. Update Database Schema

The integration automatically creates the necessary tables, but you can manually create them:

```sql
CREATE TABLE IF NOT EXISTS amazon_orders (
    order_id TEXT PRIMARY KEY,
    order_date TEXT,
    total_amount REAL,
    status TEXT,
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Usage

### In the UI

1. **Automatic Detection**: When viewing charges, Amazon transactions are automatically detected
2. **View Details**: Click "View Amazon Order Details" to fetch order information
3. **Budget Allocation**: Use the suggested categories to allocate items to appropriate budgets
4. **Caching**: Order details are cached for 7 days to reduce API calls

### Via API

```javascript
// Get Amazon order details for a charge
const response = await fetch(`/projects/ccbilling/charges/${chargeId}/amazon-details`);
const data = await response.json();

// Response includes:
{
  "success": true,
  "charge": { /* charge details */ },
  "order_id": "123-4567890-1234567",
  "order_details": {
    "order_date": "2024-01-15",
    "total_amount": 49.99,
    "status": "Delivered",
    "items": [
      {
        "name": "Product Name",
        "price": 24.99,
        "quantity": 2,
        "asin": "B08XYZ123"
      }
    ]
  },
  "suggested_categories": {
    "Electronics": {
      "items": [...],
      "total": 49.99
    }
  }
}
```

## Features

### Current Features

- ✅ Automatic Amazon order ID extraction
- ✅ Order details fetching from Amazon
- ✅ Item-level detail retrieval
- ✅ Intelligent caching (KV + D1)
- ✅ Budget category suggestions
- ✅ Bulk processing support
- ✅ UI component for viewing details

### Future Enhancements

- 🔄 Support for other retailers (Walmart, Target, etc.)
- 🔄 Machine learning for better categorization
- 🔄 Receipt image processing
- 🔄 Automated budget allocation
- 🔄 Subscription tracking
- 🔄 Price drop alerts
- 🔄 Return tracking

## Troubleshooting

### Common Issues

1. **No Order ID Found**

   - Some Amazon charges may not include order IDs
   - Digital purchases often have different formats
   - Try manually entering the order ID

2. **Authentication Failed**

   - Verify Amazon credentials are correct
   - Check for 2FA requirements
   - Consider using app-specific passwords

3. **Order Not Found**

   - Order may be from a different Amazon account
   - Order may be archived or very old
   - Business accounts may have different access

4. **Slow Performance**
   - Enable caching (KV namespace)
   - Use bulk endpoints for multiple orders
   - Check worker logs for errors

### Debug Mode

Enable debug logging:

```javascript
// In worker.py
console.log("[DEBUG]", data);

// In the UI
const response = await fetch(`/api/amazon-orders?debug=1`);
```

## Security Considerations

1. **Credentials**: Store Amazon credentials as encrypted secrets
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Authentication**: Use API keys for worker access
4. **Data Privacy**: Cache only necessary order information
5. **Access Control**: Restrict access to authorized users only

## Performance Optimization

1. **Caching Strategy**:

   - KV for short-term cache (24 hours)
   - D1 for long-term storage (7 days)
   - Client-side caching for session

2. **Batch Processing**:

   - Process multiple orders in parallel
   - Use bulk endpoints for statement imports
   - Queue processing for large batches

3. **Lazy Loading**:
   - Fetch details only when requested
   - Progressive enhancement in UI
   - Background refresh for stale data

## Cost Considerations

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **KV Storage**: Free tier includes 100,000 reads/day
- **D1 Database**: Free tier includes 5GB storage
- **Amazon API**: No direct costs, but be mindful of rate limits

## Support

For issues or questions:

1. Check the logs: `wrangler tail`
2. Review the test suite: `npm test`
3. Check worker health: `curl https://your-worker.workers.dev/health`
4. Review this documentation

## Conclusion

This integration transforms opaque Amazon charges into detailed, categorizable transactions, making budget tracking and expense management significantly more accurate and efficient. The combination of automatic detection, intelligent caching, and seamless UI integration provides a robust solution for personal finance management.
