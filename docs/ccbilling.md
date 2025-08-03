# Feature/Project Name: Personal Finance Tool for Reviewing Credit Card Statements (ccbilling)

## Overview

- The goal of this project is to automate much of the process of reviewing monthly credit card statements.

## Background / Motivation

- Today, this is a manual process, involving opening PDF documents and a Google Sheet and copying charges into running totals against different budgets

- The goal is to automate much of this process to save time, while also providing a history of the budgets and a base for identifying any insights into spending

## Requirements

### Functional Requirements

- Each month, there is a UI that creates a new 'billing cycle'. The billing cycle is defined as occurring between two dates. The start date, which will default to the day that the last billing cycle was closed, and the end date, which defaults to the current date. A billing cycle is considered 'open' while it is being edited, with statements uploaded and charges assigned, and moves to closed once all work is done.

- For a given billing cycle, credit card statements can be uploaded in PDF format. We would expect 4-5 statements to be uploaded for each cycle.

- Each statement is parsed and the list of charges presented in a UI for the billing cycle.

- Each charge will show the date, amount and merchant and be grouped by the credit card it is associated with.

- Credit cards are referenced by a user provided name, and keyed by their last 4-digits. The set of credit cards can be entered into the application and exist across billing cycles.

- For each charge the UI enables each to be associated to a 'budget' by name.

- Budgets can also be entered into the application. Each has a name, and can be associated with a list of merchants for which their charges are automatically associated with the given budget.

- It should be possible to quickly associate merchants to budgets when reviewing charges.

- In the screen for editing charges, totals for the respective budgets for the given billing cycle will be shown.

- Once a billing cycle is closed, confetti particles should be displayed to celebrate.

### Non-Functional Requirements

- All credit card statements should be stored in blob storage (Cloudflare R2) for historical reference for a given billing cycle. Uses dedicated `ccbilling` R2 bucket for organization.

- For parsing the statements, use LLAMA API with PDF-to-image conversion for robust, universal parsing. This approach works with any credit card provider format and handles layout variations better than regex-based parsing. Provider-specific parsers are maintained as fallback options.

- Access to the functionality should be restricted to a user who has logged into the website, see the /auth route.

## Implementation Approach

### Statement Parsing Strategy

**LLAMA Image-Based Parsing (Primary Method):**

- Convert PDF statements to images for LLAMA API processing
- Use LLAMA's image analysis capabilities to extract charges, dates, and amounts
- Leverage LLAMA's visual understanding to handle any credit card provider format
- This approach is more robust, universal, and handles layout variations better than regex parsing
- Provides natural language understanding of merchant names and transaction details

**Fallback Parsers (Secondary Method):**

- Maintain provider-specific parsers (Chase, Amex, etc.) as fallback options
- Use regex patterns and text processing for specific provider formats
- Ensure compatibility if LLAMA API is unavailable
- Handle edge cases where image conversion might fail

**LLAMA API Integration (Enhanced Features):**

- Use LLAMA API for merchant classification and vendor identification
- Provide charge type classification (e.g., Retail, Dining, Transportation, etc.)
- Identify vendor websites and additional merchant information
- Generate spending insights and budget recommendations

### Parser Architecture

1. **PDF Upload**: Store PDF statements in Cloudflare R2
2. **Image Conversion**: Convert PDF to high-resolution image for LLAMA processing
3. **AI Parsing**: Use LLAMA API to analyze image and extract structured charge data
4. **Universal Support**: Handle any credit card provider format without custom parsers
5. **Data Validation**: Ensure extracted charges are valid and complete
6. **Fallback Processing**: Use provider-specific parsers if image parsing fails

### Credit Card Provider Support

**Universal Approach:**

- Works with any credit card provider format
- No need for provider-specific parsers
- Handles layout variations and format changes automatically

**Fallback Support:**

- Chase (Chase Bank) - regex-based parser
- Wells Fargo - regex-based parser
- Additional providers can be added as needed

### Technical Implementation

**PDF-to-Image Conversion:**

- High-resolution image conversion (300 DPI)
- Support for multi-page statements
- Optimized image size for LLAMA API processing

**LLAMA API Integration:**

- Image input with base64 encoding
- Structured JSON response parsing
- Error handling and retry logic
- Rate limiting and API quota management

**Parser Pipeline:**

- Generic image parser (primary)
- Provider-specific parsers (fallback)
- Parser manager for routing and selection
- Comprehensive logging and debugging

## Data Model / API

- There is a first-pass schema defined [here](../webapp/ccbilling_schema.sql)

## References

- There are some UI routes and stubs already created under webapp/src/routes/ccbilling

---
