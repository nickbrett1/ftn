# Merchant Normalization Migration Status

## ✅ Completed

### 1. Database Schema Updates

- **Local Database**: Successfully updated with new columns
  - `payment.merchant_normalized` - Added
  - `payment.merchant_details` - Added
  - `budget_merchant.merchant_normalized` - Added
  - Indexes created for performance

- **Production Database**: Successfully updated with new columns
  - Schema changes applied
  - 276 existing payment records have merchant_normalized field
  - Ready for data normalization

### 2. Migration Scripts Created

- `migrations/001_add_merchant_normalization.sql` - Schema migration
- `migrations/002_normalize_existing_merchants.js` - Data normalization logic
- `migrations/run-normalization-local.js` - Local data migration runner
- `run-migration.js` - Simple migration runner for both environments
- `scripts/run-migration.sh` - Comprehensive migration script with backups

### 3. Merchant Normalization Utility

- `src/lib/utils/merchant-normalizer.js` - Core normalization logic
- Handles:
  - Food delivery services (Caviar, DoorDash, Uber Eats)
  - Ride sharing (Lyft, Uber)
  - Airlines (United, American, Delta, etc.)
  - Amazon variations
  - Gas stations
  - Grocery stores
  - Generic merchant cleanup

## 🔄 Next Steps

### 1. Update Application Code

The database functions need to be updated to use the new normalized fields:

- [ ] Update `ccbilling-db.js` functions:
  - `createPayment()` - Use normalizeMerchant() when inserting
  - `getUnassignedMerchants()` - Return merchant_normalized instead of merchant
  - `addBudgetMerchant()` - Use merchant_normalized
  - `getBudgetByMerchant()` - Use merchant_normalized
  - `refreshAutoAssociations()` - Use merchant_normalized for matching

- [ ] Update statement parsing:
  - Modify parse endpoint to normalize merchants during import
  - Store both original and normalized values

- [ ] Update UI components:
  - MerchantPicker to show normalized merchants
  - Display merchant_details where appropriate

### 2. Normalize Existing Data

**For Production:**
Since the schema is updated, you now need to normalize the existing merchant data. This can be done via:

Option A: Create a Cloudflare Worker endpoint

```javascript
// Add to your routes
app.post('/admin/normalize-merchants', async (event) => {
	// Run normalization logic
	// Process in batches to avoid timeouts
});
```

Option B: Manual SQL updates for key merchants

```sql
-- Example: Normalize Amazon variations
UPDATE payment
SET merchant_normalized = 'AMAZON',
    merchant_details = ''
WHERE merchant LIKE '%AMAZON%' OR merchant LIKE '%AMZN%';

-- Example: Normalize Caviar
UPDATE payment
SET merchant_normalized = 'CAVIAR',
    merchant_details = SUBSTR(merchant, LENGTH('CAVIAR ') + 1)
WHERE merchant LIKE 'CAVIAR %';
```

### 3. Testing Checklist

- [ ] Verify merchant picker shows consolidated merchants
- [ ] Test new statement uploads with normalization
- [ ] Confirm budget assignments work with normalized merchants
- [ ] Check that merchant details are preserved and accessible
- [ ] Validate Amazon is now included in merchant picker

### 4. Benefits Achieved

Once fully implemented, you'll have:

1. **Cleaner Merchant Picker**
   - Instead of: "CAVIAR _SUSHI PLACE_", "CAVIAR _PIZZA SHOP_"
   - You'll see: "CAVIAR"

2. **Preserved Details**
   - Restaurant names stored in merchant_details
   - Flight routes and details preserved
   - Trip information for ride sharing

3. **Better Budget Management**
   - Assign entire categories (e.g., all CAVIAR to "Food Delivery")
   - Still see specific details for expense tracking

4. **Amazon Re-included**
   - No longer excluded from picker
   - Properly normalized as "AMAZON"

## 📝 Important Notes

1. The migration is **idempotent** - safe to run multiple times
2. Original merchant names are **preserved** in the `merchant` column
3. The system is **backward compatible** - old code will still work
4. **Indexes added** for performance with normalized queries

## 🚨 If Issues Arise

1. Database backups can be restored using:

   ```bash
   npx wrangler d1 execute CCBILLING_DB --file=backups/backup_YYYYMMDD.sql
   ```

2. The original merchant data is preserved, so normalization can be re-run

3. Check logs for any errors during normalization

## 📊 Current Status

- Database Schema: ✅ Updated (Local & Production)
- Normalization Logic: ✅ Created
- Application Code: ⏳ Needs updating
- Data Migration: ⏳ Pending for production
- Testing: ⏳ Pending
