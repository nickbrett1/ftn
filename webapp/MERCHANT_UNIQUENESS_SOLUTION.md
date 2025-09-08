# Merchant Uniqueness Constraint Solution

## Problem
The MerchantPicker component was experiencing DOM indexing issues when multiple merchants with the same name were assigned to budgets. This caused Svelte to throw "Keyed each block has duplicate key" errors because the `{#each}` block was using merchant names as keys.

## Root Cause
The `budget_merchant` table allowed duplicate `merchant_normalized` values, which meant the same merchant could be assigned to multiple budgets. When the MerchantPicker component rendered these merchants, Svelte's keyed each blocks conflicted.

## Solution
Added a **unique constraint** on the `merchant_normalized` field in the `budget_merchant` table to prevent duplicate merchant assignments at the database level.

## Files Modified

### 1. Database Schema (`ccbilling_schema.sql`)
```sql
CREATE TABLE budget_merchant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budget(id),
  merchant_normalized TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_normalized)  -- Added this constraint
);
```

### 2. Database Migration (`migrations/003_add_unique_merchant_constraint.sql`)
- Removes existing duplicate entries (keeps first occurrence)
- Adds unique index on `merchant_normalized`
- Documents the purpose of the constraint

### 3. Database Function (`src/lib/server/ccbilling-db.js`)
```javascript
// Updated addBudgetMerchant to handle unique constraint gracefully
await db
  .prepare('INSERT OR IGNORE INTO budget_merchant (budget_id, merchant_normalized) VALUES (?, ?)')
  .bind(budget_id, merchant_normalized)
  .run();
```

### 4. Migration Script (`run-merchant-uniqueness-migration.js`)
- Automated script to run the migration on local or production databases
- Includes backup creation for production deployments
- Provides clear feedback and next steps

## How to Apply the Fix

### For Local Development
```bash
node run-merchant-uniqueness-migration.js local
```

### For Production
```bash
node run-merchant-uniqueness-migration.js prod
```

## Benefits

1. **Prevents DOM Key Conflicts**: No more duplicate merchant names in the database
2. **Better Data Integrity**: Each merchant can only be assigned to one budget
3. **Cleaner UI**: MerchantPicker will no longer have duplicate entries
4. **Database-Level Protection**: Constraint prevents the issue from occurring again

## Business Logic Impact

- **Before**: Merchants could be assigned to multiple budgets (causing UI issues)
- **After**: Each merchant can only be assigned to one budget (cleaner, more logical)

If you need merchants to be assignable to multiple budgets, you would need to:
1. Remove the unique constraint
2. Fix the MerchantPicker component to handle duplicates properly (e.g., use array index as key)

## Testing

The solution includes tests in `tests/merchant-uniqueness-constraint.test.js` that verify:
- Duplicate assignments are prevented
- Different merchants can still be assigned to the same budget
- The unique constraint works as expected

## Rollback Plan

If you need to rollback this change:
1. Remove the unique constraint: `DROP INDEX idx_budget_merchant_unique_normalized`
2. Revert the database function to not use `INSERT OR IGNORE`
3. Update the schema file to remove the `UNIQUE(merchant_normalized)` constraint

## Alternative Solutions Considered

1. **Frontend Fix**: Modify MerchantPicker to use array index as key instead of merchant name
   - **Pros**: No database changes needed
   - **Cons**: Doesn't fix the underlying data integrity issue

2. **Application Logic**: Add checks in the application layer
   - **Pros**: More flexible
   - **Cons**: Doesn't prevent issues if data is inserted directly into database

3. **Database Constraint**: Prevent duplicates at the database level ✅
   - **Pros**: Guarantees data integrity, prevents the issue completely
   - **Cons**: Requires migration, changes business logic slightly

The database constraint approach was chosen because it provides the strongest guarantee that the issue won't recur and improves overall data integrity.