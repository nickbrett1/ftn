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

- [ ] **MIGRATION: Replace LLAMA API parsing with direct PDF parsing**
  - [x] Create provider-specific PDF parsers
  - [x] Implement format detection logic
  - [x] Add Chase Bank statement parser
  - [ ] Add American Express statement parser
  - [ ] Add Citibank statement parser
  - [ ] Add Capital One statement parser
  - [ ] Add Discover statement parser
  - [x] Update statement parsing endpoint to use new parsers
  - [x] Add LLAMA API integration for merchant classification only
  - [x] Update tests to reflect new parsing approach

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

- LLAMA API parsing is unreliable and slow
- Complex JSON parsing logic is fragile
- Missing negative charges (refunds/credits)
- Performance issues with large statements

### New Approach Benefits

- Direct PDF parsing is faster and more reliable
- Provider-specific parsers handle format variations
- LLAMA API used appropriately for classification only
- Better error handling and validation
- More maintainable and testable code

### Next Steps

1. Create the parser architecture and base classes
2. Implement Chase Bank parser as the first example
3. Update the statement parsing endpoint
4. Add LLAMA integration for merchant classification
5. Update tests and documentation
