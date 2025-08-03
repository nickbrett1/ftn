# Cursor Context

This is a personal finance tool for reviewing credit card statements. The main feature is the CC Billing module that allows users to upload credit card statements, parse them, and categorize charges into budgets.

## Key Technologies

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Cloudflare Workers with D1 database called ccbilling
- **Storage**: Cloudflare R2 for PDF statement storage
- **AI**: LLAMA API for merchant identification
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
npm run test:once src/lib/server/ccbilling-parsers/base-parser.test.js

# Run tests with coverage (original test command)
npm test
```

This speeds up development by avoiding the watch mode overhead when you just want to check if tests pass. The `test:once` command runs tests without coverage metrics for faster execution.

### Key Features

- **AI-Powered Statement Parsing**: LLAMA API with PDF-to-image conversion for robust parsing
- **Universal Format Support**: Works with any credit card provider's statement format
- **Budget Management**: Create and manage budgets with merchant auto-assignment
- **Charge Categorization**: Assign charges to budgets with merchant classification
- **Billing Cycles**: Monthly billing cycle management with statement uploads

## Current Status

- ✅ Basic database schema and authentication
- ✅ Budget management (CRUD operations)
- ✅ Statement upload and storage
- ✅ Credit card management
- ✅ **NEW**: LLAMA image-based parsing implementation
- 🔄 **In Progress**: PDF-to-image conversion (currently using mock)
- 📋 **Planned**: Real PDF-to-image conversion and charge allocation

## Architecture

### Statement Parsing (LLAMA + Image-Based Approach)

1. **PDF Upload**: Statements stored in Cloudflare R2
2. **Image Conversion**: PDF converted to image for LLAMA processing
3. **AI Parsing**: LLAMA API analyzes image to extract charges
4. **Universal Support**: Works with any credit card provider format
5. **Fallback Parsers**: Regex-based parsers as backup for specific providers

### Parser Architecture

- **Generic Image Parser**: Primary parser using LLAMA with image input
- **Provider-Specific Parsers**: Fallback parsers for Chase, Amex, etc.
- **Parser Manager**: Routes to appropriate parser based on statement format

### Database Schema

- `credit_card` - Credit card information
- `billing_cycle` - Monthly billing periods
- `budget` - Budget categories
- `statement` - Uploaded PDF statements
- `payment` - Parsed charges from statements

## Development Notes

- Use `--run` flag for faster test execution
- LLAMA API is now the primary parsing method with image input
- Generic parser prioritizes image-based parsing over regex
- PDF-to-image conversion currently mocked, ready for real implementation
- Comprehensive test coverage for all API endpoints

## Recent Changes

- **Migrated from regex-based parsing** to LLAMA image-based parsing
- **Added PDF buffer passing** through the parsing pipeline
- **Prioritized generic image parser** over provider-specific parsers
- **Implemented mock PDF-to-image conversion** (ready for real implementation)
- **Updated parser architecture** to support both image and text-based parsing
