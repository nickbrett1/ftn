# Local Development Mode

This application now supports local development without requiring the full Cloudflare Workers environment setup.

## What This Solves

The "Error: Failed to load recent merchants" issue on the merchant auto association add merchant form was caused by missing database bindings in the local development environment. This has been resolved by implementing a local development mode that provides mock data when the `CCBILLING_DB` binding is not available.

## How It Works

When running locally without the Cloudflare database bindings, the application automatically falls back to mock data for all database operations. You'll see console logs like:

```
[DEV] CCBILLING_DB binding not found, using mock data for getRecentMerchants
[DEV] CCBILLING_DB binding not found, using mock data for getUnassignedMerchants
```

## Mock Data Provided

The local development mode provides realistic mock data for:

- **Merchants**: Amazon, Target, Walmart, Costco, Trader Joes, Starbucks, Uber Eats, DoorDash, Lyft, United Airlines, American Airlines, Delta Airlines, Marriott, Hilton, Netflix, Spotify, Apple, Google, Microsoft, Adobe, and more
- **Budgets**: Entertainment, Food & Dining, Transportation, Travel
- **Credit Cards**: Chase Sapphire, Amex Gold, Citi Double Cash
- **Billing Cycles**: Sample monthly cycles
- **Statements**: Sample credit card statements
- **Payments**: Sample transactions with realistic amounts

## Running Locally

### Option 1: Simple Development (Recommended for UI work)

```bash
cd webapp
npm run dev
```

This will run the application with mock data, allowing you to:
- Test the merchant auto association form
- See the merchant picker dropdown populated with sample data
- Test the "View All Merchants" modal
- Work on UI components without database setup

### Option 2: Full Cloudflare Environment

If you need to test with real database functionality:

1. Set up Doppler CLI and authenticate
2. Run the cloud login script:
   ```bash
   cd webapp
   bash cloud-login.sh
   ```
3. This will create `wrangler.jsonc` with proper database IDs
4. Run the development server:
   ```bash
   npm run dev
   ```

## What You'll See

### With Local Development Mode (No Database)
- ✅ Merchant picker shows sample merchants
- ✅ "View All Merchants" modal works
- ✅ All forms and UI components are functional
- ✅ Console logs show mock data usage
- ✅ No database connection errors

### With Full Cloudflare Environment
- ✅ Real database queries
- ✅ Actual merchant data from your database
- ✅ Full functionality for testing database operations

## Troubleshooting

### Still Getting "Failed to load recent merchants" Error?

1. **Check the browser console** - you should see `[DEV]` logs if local development mode is working
2. **Verify the endpoint** - the error should now show mock data instead of failing
3. **Check network tab** - the `/projects/ccbilling/budgets/recent-merchants` endpoint should return data

### Want to Customize Mock Data?

Edit the mock data in `src/lib/server/ccbilling-db.js`. Look for functions with comments like:
```javascript
// Local development mode - return mock data
console.log('[DEV] CCBILLING_DB binding not found, using mock data for getRecentMerchants');
return [
    'AMAZON',
    'TARGET',
    // ... add your preferred merchants here
];
```

## Benefits

- **Faster Development**: No need to set up Cloudflare environment for UI work
- **Consistent Data**: Always see the same sample data for testing
- **No Database Dependencies**: Work offline or without database access
- **Easy Testing**: Predictable data for testing edge cases
- **Team Collaboration**: Everyone sees the same mock data

## When to Use Each Mode

- **Local Development Mode**: UI development, component testing, form validation
- **Full Cloudflare Environment**: Database testing, integration testing, production-like testing