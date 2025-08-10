# Amazon Merchant Filtering

## Overview

The system automatically excludes Amazon merchants from the list of available merchants for auto-assignment to budgets. This is because Amazon transactions typically represent diverse purchases across multiple categories that don't fit well into single budget categories.

## Implementation

The filtering is implemented in the `getUnassignedMerchants` database function in `src/lib/server/ccbilling-db.js`. The SQL query includes a filter:

```sql
AND p.merchant NOT LIKE '%Amazon%'
```

This excludes any merchant whose name contains "Amazon" (case-insensitive in most databases).

## Why This Makes Sense

- **Diverse Transactions**: Amazon sells everything from groceries to electronics to clothing
- **Mixed Categories**: A single Amazon transaction could include items from multiple budget categories
- **Better User Experience**: Prevents users from accidentally assigning all Amazon transactions to a single budget
- **Manual Assignment**: Users can still manually assign individual Amazon transactions to appropriate budgets

## Future Enhancements

The current implementation uses a simple text-based filter. Future versions could include:

- More sophisticated merchant categorization
- Configurable exclusion lists
- Pattern-based filtering for other large retailers
- User-configurable filtering rules

## Testing

The feature is tested in:
- `src/lib/server/ccbilling-db.test.js` - Database function tests
- `src/routes/projects/ccbilling/budgets/unassigned-merchants/server.test.js` - API endpoint tests
- `src/lib/components/MerchantPicker.test.js` - Component tests

All tests use non-Amazon merchant names to ensure the filtering works correctly.