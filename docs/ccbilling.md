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

- For parsing the statements, use direct PDF parsing with format-specific parsers for different credit card providers. The LLAMA LLM API will be used for merchant classification and vendor identification, not for core statement parsing.

- Access to the functionality should be restricted to a user who has logged into the website, see the /auth route.

## Implementation Approach

### Statement Parsing Strategy

**Direct PDF Parsing (Primary Method):**

- Implement format-specific parsers for different credit card providers (Chase, Amex, Citi, etc.)
- Use `pdf-parse` library to extract text from PDFs
- Apply regex patterns and text processing to identify charges, dates, and amounts
- Handle different statement formats and layouts systematically
- This approach is faster, more reliable, and less prone to missing data than LLM-based parsing

**LLAMA API Integration (Secondary Use):**

- Use LLAMA API for merchant classification and vendor identification
- Provide charge type classification (e.g., Retail, Dining, Transportation, etc.)
- Identify vendor websites and additional merchant information
- This is more appropriate for LLAMA as we can be tolerant of occasional mistakes in classification

### Parser Architecture

1. **PDF Text Extraction**: Use `pdf-parse` to extract raw text from PDF statements
2. **Format Detection**: Identify the credit card provider and statement format
3. **Provider-Specific Parsing**: Apply format-specific parsing rules for each provider
4. **Data Validation**: Ensure extracted charges are valid and complete
5. **LLAMA Enhancement**: Use LLAMA API to classify merchants and provide additional context

### Credit Card Provider Support

Initial focus on major providers:

- Chase (Chase Bank)
- Wells Fargo

Each provider will have its own parsing module that understands their specific statement format.

## Data Model / API

- There is a first-pass schema defined [here](../webapp/ccbilling_schema.sql)

## References

- There are some UI routes and stubs already created under webapp/src/routes/ccbilling

---
