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

## Planned 📋

### Core Functionality

- [ ] Charge allocation to budgets
- [ ] Budget totals and reporting
- [ ] Merchant auto-assignment based on budget rules
- [ ] Statement re-parsing capability
- [ ] Error handling and validation for parsed data
- [ ] Confetti celebration when billing cycle is closed

### UI/UX Improvements

- [ ] Drag-and-drop file upload
- [ ] Progress indicators for parsing
- [ ] Better error messages and user feedback
- [ ] Responsive design improvements
- [ ] Loading states and animations

### Advanced Features

- [ ] Statement format auto-detection
- [ ] Support for additional credit card providers
- [ ] Export functionality (CSV, PDF reports)
- [ ] Historical spending analysis
- [ ] Budget vs actual spending comparisons
- [ ] Merchant categorization insights

### Technical Debt

- [ ] Performance optimization for large statements
- [ ] Caching strategies for parsed data
- [ ] Rate limiting for LLAMA API calls
- [ ] Error recovery and retry mechanisms
- [ ] Comprehensive logging and monitoring

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

### Phase 2: Merchant Classification

- [ ] Keep LLAMA API for merchant classification only
- [ ] Use parsed merchant names from PDF.js
- [ ] Classify merchants for budget assignment
- [ ] Add merchant insights and categorization
