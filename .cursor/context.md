# Cursor Context

This is a personal finance tool for reviewing credit card statements. The main feature is the CC Billing module that allows users to upload credit card statements, parse them, and categorize charges into budgets.

## Key Technologies

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Cloudflare Workers with D1 database called ccbilling
- **Storage**: Cloudflare R2 for PDF statement storage
- **Testing**: Vitest with comprehensive test coverage
- **Authentication**: OAuth with Google

## Project Structure

- `webapp/` - Main SvelteKit application
- `docs/` - Documentation and requirements
- `.cursor/` - Cursor-specific configuration

## Development Workflow

### Testing Configuration

When running tests in Cursor, use the `test:once` command to execute tests once and exit instead of running in watch mode:

```bash
# Run all tests once (no coverage)
npm run test:once

# Run specific test file once
npm run test:once -- "src/routes/projects/ccbilling/statements/[id]/parse/server.test.js"

# Run tests with coverage (original test command - runs in watch mode)
npm test
```

**Important**: The default `npm test` command runs in watch mode and can get stuck when running single test files. Always use `npm run test:once` for single test runs to avoid watch mode issues.

This speeds up development by avoiding the watch mode overhead when you just want to check if tests pass. The `test:once` command runs tests without coverage metrics for faster execution.

### Key Features

- **Provider-Specific Statement Parsing**: Dedicated parsers for each credit card provider (currently Chase)
- **Text-Based Parsing**: Extracts text from PDFs and uses regex-based parsing for structured data extraction
- **Budget Management**: Create and manage budgets with merchant auto-assignment
- **Charge Categorization**: Assign charges to budgets with merchant classification
- **Billing Cycles**: Monthly billing cycle management with statement uploads

## Current Status

- ✅ Basic database schema and authentication
- ✅ Budget management (CRUD operations)
- ✅ Statement upload and storage
- ✅ Credit card management
- ✅ **NEW**: Chase statement parser implementation
- 🔄 **In Progress**: Additional provider parsers (Amex, etc.)
- 📋 **Planned**: More provider parsers and enhanced parsing accuracy

## Architecture

### Statement Parsing (Provider-Specific Approach)

1. **PDF Upload**: Statements stored in Cloudflare R2
2. **Text Extraction**: PDF text content extracted for parsing
3. **Parser Detection**: ParserFactory detects appropriate parser based on statement format
4. **Provider-Specific Parsing**: Dedicated parsers for each credit card provider
5. **Structured Data**: Regex-based extraction of charges, dates, and card information

### Parser Architecture

- **ParserFactory**: Routes to appropriate parser based on statement format detection
- **Provider-Specific Parsers**: Dedicated parsers for each credit card provider (Chase, Amex, etc.)
- **BaseParser**: Common functionality and utilities for all parsers
- **Text-Based Processing**: Extracts structured data from PDF text content

### Database Schema

- `credit_card` - Credit card information
- `billing_cycle` - Monthly billing periods
- `budget` - Budget categories
- `statement` - Uploaded PDF statements
- `payment` - Parsed charges from statements

## Development Notes

- Use `--run` flag for faster test execution
- Current implementation uses text-based parsing with provider-specific parsers
- Chase parser is fully implemented with comprehensive test coverage
- ParserFactory architecture allows easy addition of new provider parsers
- Comprehensive test coverage for all API endpoints and parsers

## Recent Changes

- **Implemented Chase statement parser** with full regex-based parsing
- **Added ParserFactory** for provider detection and routing
- **Created BaseParser** with common parsing utilities
- **Enhanced test coverage** for all parser components
- **Updated parsing pipeline** to use provider-specific parsers

## Supported Providers

- **Chase**: Fully implemented with comprehensive parsing
- **Amex**: Planned (parser structure ready)
- **Other providers**: Can be easily added using the ParserFactory pattern
