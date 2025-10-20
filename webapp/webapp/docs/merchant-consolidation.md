# Merchant Consolidation

The merchant consolidation feature helps identify and merge similar merchant records that represent the same business but have variations in naming, store numbers, phone numbers, or address formats.

## Problem

Credit card statements often contain merchant names with slight variations that represent the same business:

- **Store number variations**: `PINKBERRY 15012 NEW YORK` vs `PINKBERRY 15038 NEW YORK`
- **Spacing variations**: `PLANT SHED 87 CORP NEW YORK` vs `PLANTSHED 8007539595`
- **Address format variations**: `TST* DIG INN- 100 W 67 NEW YORK` vs `TST* DIG INN- 100 W 67TH NEW YORK`

These variations make it difficult to:
- Track spending patterns across the same business
- Assign merchants to budgets consistently
- Generate accurate reports

## Solution

The consolidation system uses pattern matching and similarity algorithms to:

1. **Identify similar merchants** using multiple detection patterns
2. **Choose canonical forms** based on usage frequency and name length
3. **Consolidate records** by updating all payment and budget records

## Usage

### Admin Interface

1. Navigate to **Admin Tools** in the CC Billing section
2. Scroll to the **Merchant Consolidation** section
3. Click **Refresh Analysis** to see similar merchants
4. Review the preview to understand what will be consolidated
5. Click **Run Consolidation** to perform the consolidation

## Detection Patterns

- **Store Number Variations**: Same business name + location, different store numbers (95% confidence)
- **Spacing Variations**: Same name with/without spaces (90% confidence)
- **Phone Number Variations**: Same business name with/without phone numbers (90% confidence)
- **Address Format Variations**: Same address with different formatting (95% confidence)
- **Generic Business Variations**: Same name with different business suffixes (85% confidence)

## Safety Features

- **Dry run by default**: All operations start with a preview
- **Confidence thresholds**: Only high-confidence matches are consolidated
- **Error handling**: Failed consolidations are logged and reported
- **Budget preservation**: Budget assignments are carefully merged to avoid conflicts
