# Cursor Context

This is a personal finance tool for reviewing credit card statements. The main feature is the CC Billing module that allows users to upload credit card statements, parse them, and categorize charges into budgets.

## Key Technologies

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Cloudflare Workers with D1 database
- **Storage**: Cloudflare R2 for PDF statement storage
- **Testing**: Vitest with comprehensive test coverage
- **Authentication**: OAuth with Google

## Project Structure

- `webapp/` - Main SvelteKit application
- `docs/` - Documentation and requirements
- `.cursor/` - Cursor-specific configuration

## Development Workflow

### Testing Configuration

When running tests in Cursor, use the `--run` flag to execute tests once and exit instead of running in watch mode:

```bash
# Run specific test file once
npm test -- src/lib/server/ccbilling-parsers/base-parser.test.js --run

# Run all tests once
npm test -- --run

# Run tests with coverage once
npm test -- --run --coverage
```

This speeds up development by avoiding the watch mode overhead when you just want to check if tests pass.

### Key Features

- **Statement Parsing**: Direct PDF parsing with provider-specific parsers (Chase, Amex, etc.)
- **Budget Management**: Create and manage budgets with merchant auto-assignment
- **Charge Categorization**: Assign charges to budgets with merchant classification
- **Billing Cycles**: Monthly billing cycle management with statement uploads

## Current Status

- ✅ Basic database schema and authentication
- ✅ Budget management (CRUD operations)
- ✅ Statement upload and storage
- ✅ Credit card management
- 🔄 **In Progress**: Migrating from LLAMA API parsing to direct PDF parsing
- 📋 **Planned**: Charge allocation and budget reporting

## Architecture

### Statement Parsing (New Approach)

1. **Direct PDF Parsing**: Provider-specific parsers extract charges reliably
2. **LLAMA Integration**: Used only for merchant classification and insights
3. **Parser Architecture**: Base parser class with provider-specific implementations

### Database Schema

- `credit_card` - Credit card information
- `billing_cycle` - Monthly billing periods
- `budget` - Budget categories
- `statement` - Uploaded PDF statements
- `payment` - Parsed charges from statements

## Development Notes

- Use `--run` flag for faster test execution
- LLAMA API is now used only for merchant classification, not core parsing
- Provider-specific parsers handle different statement formats
- Comprehensive test coverage for all API endpoints
