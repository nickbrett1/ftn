# Feature/Project Name: Personal Finance Tool for Reviewing Credit Card Statements (ccbilling)

## Overview

- The goal of this project is to automate much of the process of reviewing monthly credit card statements.

## Background / Motivation

- Today, this is a manual process, involving opening PDF documents and a Google Sheet and copying charges into running totals against different budgets

- The goal is to automate much of this process to save time, while also providing a history of the budgets and a base for identifying any insights into spending

## Requirements

### Functional Requirements

- Each month, there is a UI that creates a new 'billing cycle'. The billing cycle is defined as occurring between two dates. The start date, which will default to the day that the last billing cycle was closed, and the end date, which defaults to the current date. A billing cycle is considered 'open' while it is being edited, with statements uploaded and charges assigned, and moves to closed once all work is done.

- For a given billing cycle, credit card statements can be uploaded in PDF format. There are example statements in the `docs/ccbillingstatements` directory. We would expect 4-5 statements to be uploaded for each cycle.

- Each statement is parsed and the list of charges presented in a UI for the billing cycle.

- Each charge will show the date, amount and merchant and be grouped by the credit card it is associated with.

- Credit cards are referenced by a user provided name, and keyed by their last 4-digits. The set of credit cards can be entered into the application and exist across billing cycles.

- For each charge the UI enables each to be associated to a 'budget' by name.

- Budgets can also be entered into the application. Each has a name, and can be associated with a list of merchants for which their charges are automatically associated with the given budget.

- It should be possible to quickly associate merchants to budgets when reviewing charges.

- In the screen for editing charges, totals for the respective budgets for the given billing cycle will be shown.

- Once a billing cycle is closed, confetti particles should be displayed to celebrate.

### Non-Functional Requirements

- All credit card statements should be stored in blob storage (Cloudflare R2) for historical reference for a given billing cycle

- For parsing the statements, use the Llama LLM API. The API documentation is available [here](https://llama.developer.meta.com/docs/overview/?team_id=1373601037234179)

- Access to the functionality should be restricted to a user who has logged into the website, see the /auth route.

## Data Model / API

- There is a first-pass schema defined [here](../webapp/ccbilling_schema.sql)

## References

- There are some UI routes and stubs already created under webapp/src/routes/ccbilling

---
