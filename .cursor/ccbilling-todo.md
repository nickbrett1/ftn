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
- [x] **PDF.js Integration** - Added `pdfjs-dist` dependency
- [x] **Foreign Currency Parsing** - Fully implemented and working
- [x] **Enhanced JSON Parsing** - Secure JSON array extraction with `findJsonArray` function
- [x] **Comprehensive Test Coverage** - Added tests for credit card management, auth flow, and parsing robustness
- [x] **Authentication Robustness** - Enhanced error handling and response formatting
- [x] **Statement Parsing Security** - ReDoS vulnerability prevention and robust JSON handling
- [x] **Manual Charge Allocation** - Click-to-cycle allocation system with budget icons
- [x] **Running Totals Footer** - Fixed footer showing allocation totals for all budgets
- [x] **Flight Details Parsing** - Airport code extraction and display for flight transactions
- [x] **Foreign Currency Formatting** - Inline display of foreign currency amounts in merchant names
- [x] **Svelte 5 Migration** - Updated to use runes (`$props()`, `$state()`, `$derived()`, `$effect()`)
- [x] **UI Refresh Fixes** - Proper `invalidate()` usage with `event.depends()` for reactive updates

### **COMPLETED - Manual Allocation & Enhanced Parsing (Latest)**

- [x] **Manual Charge Allocation System**

  - Single-click allocation cycling through budgets (including "None")
  - Visual budget icons (🛒 Groceries, 🍽️ Dining, 🚗 Transportation, etc.)
  - Loading states during allocation updates
  - Real-time UI updates without page refresh

- [x] **Running Totals Footer**

  - Fixed footer displaying allocation totals for all budgets
  - Shows totals for "None" allocation as well
  - Updates automatically when allocations change
  - Always visible at bottom of screen

- [x] **Flight Details Parsing**

  - Enhanced Chase parser to detect flight transactions (UNITED, AMERICAN, DELTA, etc.)
  - Multi-line airport code extraction (e.g., "100925 1 L LGA IAH")
  - Flight details stored as JSON in database (`flight_details` column)
  - Display format: `✈️ UNITED 0162313425796 UNITED.COM TX (LGA, IAH)`

- [x] **Foreign Currency Formatting**

  - Enhanced foreign currency detection to work with any merchant name
  - Improved currency line detection (handles date prefixes like "07/01 POUND STERLING")
  - Enhanced exchange rate parsing (handles extra text like "(EXCHG RATE)")
  - Display format: `HM PASSPORT OFFICE DURHAM (127.86 POUND STERLING)`

- [x] **Svelte 5 Migration**

  - Updated from Svelte 4 to Svelte 5 runes syntax
  - `export let data` → `let { data } = $props()`
  - `$: { ... }` → `$effect(() => { ... })`
  - `$: variable = ...` → `let variable = $derived(...)`
  - `let variable = ...` → `let variable = $state(...)`
  - `on:click` → `onclick` (event handler syntax)

- [x] **UI Refresh & Reactivity Fixes**
  - Fixed `invalidate()` usage with proper `event.depends()` declarations
  - Cycle-specific invalidation: `event.depends(\`cycle-${cycleId}\`)`
  - Proper reactive updates without page reloads
  - Fixed parsing button spinner states
  - Enhanced error popup display with user-friendly formatting

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

- [ ] **Phase 2: Merchant Classification with LLAMA API**
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

- [x] ~~Charge allocation to budgets~~ **COMPLETED** - Manual allocation system implemented
- [ ] Budget totals and reporting
- [ ] Merchant auto-assignment based on budget rules
- [ ] Statement re-parsing capability
- [ ] Error handling and validation for parsed data
- [ ] Confetti celebration when billing cycle is closed

### Budget Management

- [x] ~~Implement budget tracking by category~~ **COMPLETED** - Running totals footer implemented
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
- [x] ~~Mobile-responsive design improvements~~ **COMPLETED** - Enhanced mobile UI
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

### Current Implementation Status

- ✅ **PDF.js is already integrated** - `pdfjs-dist` dependency is installed
- ✅ **LLAMA API parsing is working** - Current implementation is functional
- ✅ **Foreign currency parsing is complete** - Multi-line transactions supported
- ✅ **Comprehensive test coverage** - Auth, parsing, and UI components tested
- ✅ **Security improvements** - ReDoS prevention and robust JSON handling
- ✅ **Manual allocation system** - Click-to-cycle budget assignment with visual feedback
- ✅ **Running totals** - Fixed footer showing allocation summaries
- ✅ **Flight details parsing** - Airport codes extracted and displayed
- ✅ **Foreign currency formatting** - Inline display in merchant names
- ✅ **Svelte 5 migration** - Modern reactivity system implemented

### Next Priority: Phase 2 - Merchant Classification

The current system is working well with LLAMA API parsing. The next logical step is to enhance merchant classification capabilities:

1. **Merchant Categorization** - Use LLAMA API to classify merchants into categories
2. **Auto-Assignment** - Automatically assign charges to budgets based on merchant categories
3. **Analytics Dashboard** - Create insights based on spending patterns

### **CURRENT STATUS**

**Major Accomplishments Today:**

- ✅ **Manual Charge Allocation** - Users can now click to cycle through budget allocations
- ✅ **Running Totals** - Always-visible footer showing allocation summaries
- ✅ **Flight Details** - Airport codes displayed for flight transactions
- ✅ **Foreign Currency Formatting** - Foreign amounts shown inline with merchant names
- ✅ **Svelte 5 Migration** - Updated to modern reactivity system
- ✅ **UI Refresh Fixes** - Proper reactive updates without page reloads

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
  allocated_to TEXT,
  transaction_date DATE,
  is_foreign_currency BOOLEAN DEFAULT 0,
  foreign_currency_amount REAL,
  foreign_currency_type TEXT,
  flight_details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Flight Details Detection:**

- Multi-line transaction parsing for airport codes
- Pattern matching: `100925 1 L LGA IAH` → extracts `LGA` and `IAH`
- Display format: `✈️ UNITED 0162313425796 UNITED.COM TX (LGA, IAH)`

**Foreign Currency Detection:**

- Multi-line transaction parsing for currency conversion details
- Exchange rate pattern matching: `127.86 X 1.375567026 (EXCHG RATE)`
- Display format: `HM PASSPORT OFFICE DURHAM (127.86 POUND STERLING)`

**PDF Parsing Improvements:**

- Line-based parsing with proper Y-position grouping
- Amount pattern matching: `([-\d,]*\.?\d{1,2})$`
- Foreign currency look-ahead logic for multi-line transactions

**Security Enhancements:**

- Secure JSON array extraction with `findJsonArray` function
- ReDoS vulnerability prevention
- Robust error handling for malformed JSON responses

**Svelte 5 Reactivity:**

- Modern runes syntax for better performance
- Proper `invalidate()` usage with dependency declarations
- Real-time UI updates without page refreshes
