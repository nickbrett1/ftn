# Merchant Deduplication Feature

## Overview

The merchant deduplication feature addresses the problem of duplicate merchants that only differ in case (e.g., "AMAZON" vs "amazon" vs "Amazon"). This ensures consistency across the credit card billing system.

## How It Works

### 1. Detection

- Scans all `merchant_normalized` values from both `payment` and `budget_merchant` tables
- Groups merchants by their uppercase form to identify case-only duplicates
- Counts usage of each variant to provide detailed analysis

### 2. Canonical Form Selection

The system chooses a canonical form using this priority:

1. **Uppercase versions** are preferred (e.g., "AMAZON" over "amazon")
2. **Alphabetical order** as a tiebreaker if multiple uppercase versions exist

### 3. Deduplication Process

- **Payment records**: Updates all non-canonical variants to use the canonical form
- **Budget assignments**: Handles conflicts intelligently:
  - If a budget already has the canonical form, removes duplicate assignments
  - If a budget doesn't have the canonical form, updates the variant to canonical
  - Prevents duplicate budget-merchant relationships

## API Endpoints

### GET `/api/admin/deduplicate-merchants`

Returns analysis of duplicate merchants without making changes.

**Response:**

```json
{
	"duplicatesFound": 3,
	"totalVariants": 8,
	"totalPaymentsAffected": 150,
	"totalBudgetMerchantsAffected": 5,
	"duplicates": [
		{
			"canonicalForm": "AMAZON",
			"canonical": "AMAZON",
			"variants": [
				{
					"variant": "AMAZON",
					"paymentCount": 100,
					"budgetCount": 1,
					"isCanonical": true
				},
				{
					"variant": "amazon",
					"paymentCount": 30,
					"budgetCount": 0,
					"isCanonical": false
				}
			],
			"totalVariants": 2
		}
	]
}
```

### POST `/api/admin/deduplicate-merchants`

Performs the actual deduplication.

**Request:**

```json
{
	"dryRun": false // Set to true for preview mode (default: true)
}
```

**Response:**

```json
{
	"success": true,
	"dryRun": false,
	"duplicatesProcessed": 3,
	"paymentsUpdated": 50,
	"budgetMerchantsUpdated": 2,
	"budgetMerchantsRemoved": 3,
	"errors": []
}
```

## Admin Interface

The deduplication feature is accessible through the Admin Tools page at `/projects/ccbilling/admin`. The interface provides:

1. **Analysis Preview**: Shows duplicate groups and their impact
2. **Refresh Analysis**: Updates the duplicate detection
3. **Run Deduplication**: Performs the actual merge operation

## Safety Features

- **Authentication Required**: Only authenticated admin users can access
- **Dry Run Default**: POST requests default to dry run mode
- **Transaction Safety**: Updates are performed in logical groups
- **Error Handling**: Graceful handling of database errors
- **Conflict Resolution**: Smart handling of budget assignment conflicts

## Use Cases

### Example Scenario

You have these merchants in your system:

- "AMAZON" (100 payments, assigned to "Shopping" budget)
- "amazon" (30 payments, not assigned)
- "Amazon" (20 payments, assigned to "Shopping" budget - duplicate!)

**After deduplication:**

- All 150 payments use "AMAZON" as merchant_normalized
- Only one "AMAZON" → "Shopping" budget assignment remains
- Data consistency is restored

## Integration

The deduplication works alongside the existing merchant normalization system:

1. Run normalization first to ensure consistent `merchant_normalized` values
2. Run deduplication to merge case-only duplicates
3. Both processes can be run from the same admin interface

## Database Impact

The feature modifies:

- `payment.merchant_normalized` - Updates to canonical forms
- `budget_merchant.merchant_normalized` - Updates to canonical forms
- `budget_merchant` records - Removes true duplicates

No changes are made to:

- Original merchant names (`payment.merchant`)
- Budget names or IDs
- Payment amounts or dates
