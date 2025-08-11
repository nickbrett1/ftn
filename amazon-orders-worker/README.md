# Amazon Orders Worker

This Cloudflare Worker integrates with the `amazon-orders` Python library to fetch detailed order information from Amazon based on order identifiers found in credit card statements.

## Features

- **Order ID Extraction**: Automatically extracts Amazon order IDs from merchant strings in credit card statements
- **Order Details Fetching**: Retrieves comprehensive order information including:
  - Order date and total amount
  - Individual items with names, prices, and quantities
  - Order status
  - Product links and ASINs
- **Caching**: Implements both KV storage and D1 database caching for performance
- **Bulk Processing**: Can process multiple orders in a single request
- **Category Suggestions**: Automatically categorizes Amazon purchases into budget categories

## Setup

### 1. Install Dependencies

```bash
cd amazon-orders-worker
npm install -g wrangler
pip install -r requirements.txt
```

### 2. Configure Wrangler

Update `wrangler.toml` with your Cloudflare account details and create the necessary resources:

```bash
# Create KV namespace for caching
wrangler kv:namespace create "AMAZON_CACHE"

# Create D1 database for order history
wrangler d1 create amazon-orders-db
```

### 3. Set Environment Variables

Add your Amazon credentials as secrets:

```bash
wrangler secret put AMAZON_EMAIL
# Enter your Amazon email when prompted

wrangler secret put AMAZON_PASSWORD
# Enter your Amazon password when prompted

# Optional: Set the worker URL in your main app
wrangler secret put AMAZON_ORDERS_WORKER_URL
# Enter the deployed worker URL
```

### 4. Deploy the Worker

```bash
wrangler deploy
```

## API Endpoints

### Health Check

```
GET /health
```

Returns the worker status and configuration state.

### Parse Merchant String

```
POST /parse
Content-Type: application/json

{
  "merchant": "AMAZON.COM*123-4567890-1234567"
}
```

Extracts the order ID from a merchant string.

### Get Order Details

```
GET /order/{orderId}
```

Fetches detailed information for a specific Amazon order.

### Bulk Processing

```
POST /bulk
Content-Type: application/json

{
  "merchants": [
    "AMAZON.COM*123-4567890-1234567",
    "AMZN.COM/BILL 987-6543210-9876543"
  ],
  "fetch_details": true
}
```

Process multiple merchant strings and optionally fetch their order details.

## Integration with Credit Card Billing

The worker integrates seamlessly with the credit card billing system:

1. **Automatic Detection**: When viewing charges, the system automatically detects Amazon transactions
2. **Order Enrichment**: Click on any Amazon charge to fetch detailed order information
3. **Budget Categorization**: The system suggests budget categories based on purchased items
4. **Caching**: Order details are cached to reduce API calls and improve performance

### Usage in the Main App

```javascript
// In your charge details page
const response = await fetch(
  `/projects/ccbilling/charges/${chargeId}/amazon-details`
);
const data = await response.json();

if (data.success) {
  // Display order items
  console.log(data.order_details.items);

  // Show suggested categories
  console.log(data.suggested_categories);
}
```

## Order ID Patterns

The worker recognizes various Amazon order ID formats:

- Standard format: `123-4567890-1234567` (XXX-XXXXXXX-XXXXXXX)
- Compact format: `1234567890123456` (16 digits)
- Legacy formats: Various 10+ digit sequences

Common merchant string patterns:

- `AMAZON.COM*123-4567890-1234567`
- `AMZN.COM/BILL 123-4567890-1234567`
- `Amazon.com 1234567890123456`
- `AMAZON MARKETPLACE 123-4567890-1234567`

## Troubleshooting

### Worker Not Finding Orders

1. Verify Amazon credentials are correctly set
2. Check that the order ID format is recognized
3. Ensure the Amazon account has access to the order

### Performance Issues

1. Enable caching by configuring KV namespace
2. Use bulk endpoints for processing multiple orders
3. Implement database caching for frequently accessed orders

### Authentication Errors

1. Amazon may require CAPTCHA verification - check the library documentation
2. Consider using app-specific passwords if 2FA is enabled
3. Rotate credentials if they become invalid

## Development

### Local Testing

```bash
# Run the worker locally
wrangler dev

# Test endpoints
curl http://localhost:8787/health
```

### Adding New Features

1. **Custom Parsers**: Extend `extract_order_id()` for new merchant formats
2. **Category Rules**: Update `categorizeAmazonItems()` in the integration service
3. **Additional Data**: Modify `fetch_order_details()` to include more order information

## Security Considerations

- Store Amazon credentials as encrypted secrets
- Implement rate limiting to prevent abuse
- Use authentication tokens for API access
- Regularly rotate credentials
- Monitor for unusual access patterns

## Future Enhancements

- [ ] Support for other retailers (Walmart, Target, etc.)
- [ ] Machine learning for better item categorization
- [ ] Integration with receipt scanning
- [ ] Automated budget allocation based on purchase history
- [ ] Support for Amazon Business accounts
- [ ] Multi-currency support for international orders
