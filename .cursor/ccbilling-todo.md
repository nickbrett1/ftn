# CC Billing TODO

## Completed ✅

- [x] Basic database schema and tables
- [x] Authentication integration
- [x] Billing cycle management (create, list, close)
- [x] Credit card management (CRUD operations)
- [x] Statement upload and storage in R2
- [x] Budget management (CRUD operations)
- [x] Budget-merchant associations
- [x] Basic UI for viewing billing cycles and statements
- [x] Statement parsing with LLAMA API (current implementation)
- [x] Comprehensive test coverage for budget management

### **COMPLETED - Foreign Currency Parsing (Phase 1)**

- [x] **Database Schema Updates**

  - Added foreign currency columns to `payment` table:
    - `is_foreign_currency BOOLEAN DEFAULT 0`
    - `foreign_currency_amount REAL`
    - `foreign_currency_type TEXT`
  - Updated `ccbilling_schema.sql` to reflect current state
  - Applied migrations to local and remote databases
  - Fixed failing tests to include new foreign currency columns

- [x] **Enhanced PDF Parsing**

  - Fixed PDF text extraction to preserve line breaks properly
  - Improved amount pattern matching to handle amounts like `.14`
  - Added foreign currency detection and parsing logic
  - Implemented multi-line foreign currency transaction handling

- [x] **Foreign Currency Support**
  - Detects foreign transactions (e.g., "DSB" for Danish transactions)
  - Captures foreign currency amounts and types from conversion lines
  - Displays foreign currency info in dedicated UI column
  - Properly handles multi-line foreign currency transactions
  - Removed debug statements and reinstated automatic page refresh

**Example Foreign Currency Transaction:**

```
06/21 DSB 7-ELEVEN KVIKK KOEBENHAVN V 22.45
06/22 DANISH KRONE
145.00 X 0.154827586 (EXCHG RATE)
```

**Result:** Single transaction with foreign currency details attached

**Supported currencies:** DSB, DANISH KRONE, EURO, POUND, YEN, FRANC, KRONA, PESO, REAL, YUAN, WON, RUBLE, LIRA, RAND

## In Progress 🔄

- [ ] **REFACTOR: Replace LLAMA API parsing with PDF.js browser parsing**
  - [ ] Remove LLAMA API dependencies (llama-api-client, pdftoimg-js)
  - [ ] Add PDF.js for browser-based PDF parsing
  - [ ] Create provider-specific PDF parsers (Chase, AmEx, Citi, etc.)
  - [ ] Implement structured data extraction:
    - [ ] Credit card last 4 digits
    - [ ] Statement closing date
    - [ ] List of charges/credits (excluding payments)
  - [ ] Update statement parsing endpoint to use new parsers
  - [ ] Keep LLAMA API for merchant classification only (Phase 2)
  - [ ] Update tests to reflect new parsing approach
  - [ ] Revert schema changes for image support

### **Phase 2: Merchant Classification**

- [ ] Implement merchant classification using LLAMA API
- [ ] Add merchant categorization to database schema
- [ ] Create merchant classification service
- [ ] Integrate with existing parsing pipeline
- [ ] Add merchant categories (e.g., "Restaurants", "Travel", "Shopping")
- [ ] Implement merchant tagging system
- [ ] Add merchant search and filtering
- [ ] Create merchant analytics dashboard

## Planned 📋

### Core Functionality

- [ ] Charge allocation to budgets
- [ ] Budget totals and reporting
- [ ] Merchant auto-assignment based on budget rules
- [ ] Statement re-parsing capability
- [ ] Error handling and validation for parsed data
- [ ] Confetti celebration when billing cycle is closed

### Budget Management

- [ ] Implement budget tracking by category
- [ ] Add budget alerts and notifications
- [ ] Create budget vs actual spending reports
- [ ] Add budget rollover functionality

### Advanced Analytics

- [ ] Spending trends analysis
- [ ] Category-based spending reports
- [ ] Year-over-year comparison
- [ ] Export functionality for tax purposes

### UI/UX Improvements

- [ ] Drag-and-drop file upload
- [ ] Progress indicators for parsing
- [ ] Better error messages and user feedback
- [ ] Responsive design improvements
- [ ] Loading states and animations
- [ ] Mobile-responsive design improvements
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Bulk operations for charges

### Advanced Features

- [ ] Statement format auto-detection
- [ ] Support for additional credit card providers
- [ ] Export functionality (CSV, PDF reports)
- [ ] Historical spending analysis
- [ ] Budget vs actual spending comparisons
- [ ] Merchant categorization insights

### System Improvements

- [ ] Performance optimization for large statements
- [ ] Caching strategies for parsed data
- [ ] Rate limiting for LLAMA API calls
- [ ] Error recovery and retry mechanisms
- [ ] Comprehensive logging and monitoring
- [ ] Caching improvements
- [ ] Error handling enhancements
- [ ] Automated testing coverage

## Notes

### Current Implementation Issues

- LLAMA API parsing is unreliable for structured data extraction
- Complex JSON parsing logic is fragile
- Missing negative charges (refunds/credits)
- Performance issues with large statements
- Generic prompts don't work well for specific data extraction

### New Approach Benefits

- PDF.js browser parsing is faster and more reliable
- Provider-specific parsers handle format variations
- Structured extraction of specific data points
- LLAMA API used appropriately for classification only (Phase 2)
- Better error handling and validation
- More maintainable and testable code

### Next Steps

1. Remove LLAMA API dependencies
2. Add PDF.js for browser-based parsing
3. Create parser architecture and base classes
4. Implement Chase Bank parser as the first example
5. Update the statement parsing endpoint
6. Add LLAMA integration for merchant classification (Phase 2)
7. Update tests and documentation

### **CURRENT STATUS**

**Phase 1 Complete:** Foreign currency parsing is fully implemented and working. The system can now:

- Parse PDF statements with proper line break preservation
- Detect and combine multi-line foreign currency transactions
- Store foreign currency data in the database
- Display foreign currency information in the UI
- Handle various amount formats (including `.14` style amounts)

**Next Priority:** Phase 2 - Merchant classification using LLAMA API for enhanced merchant categorization and analytics.

### **TECHNICAL NOTES**

**Database Schema:**

```sql
-- Current payment table structure
CREATE TABLE payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL REFERENCES statement(id),
  merchant TEXT NOT NULL,
  amount REAL NOT NULL,
  allocated_to TEXT NOT NULL,
  transaction_date DATE,
  is_foreign_currency BOOLEAN DEFAULT 0,
  foreign_currency_amount REAL,
  foreign_currency_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Foreign Currency Detection:**

- Multi-line transaction parsing for currency conversion details
- Exchange rate pattern matching: `145.00 X 0.154827586`

**PDF Parsing Improvements:**

- Line-based parsing with proper Y-position grouping
- Amount pattern matching: `([-\d,]*\.?\d{1,2})$`
- Foreign currency look-ahead logic for multi-line transactions
