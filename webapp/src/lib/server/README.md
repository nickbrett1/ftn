# Server-Side Utilities

This directory contains **server-side utility functions** that handle database operations, authentication, and route utilities for the SvelteKit application.

## ccbilling-db.js

Provides comprehensive database operations for the CCBILLING_DB using Cloudflare D1.

### Credit Card Operations

#### `listCreditCards(event)`

List all credit cards ordered by creation date.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object

**Returns:** Promise<Array> - Array of credit card objects

#### `getCreditCard(event, id)`

Get a single credit card by ID.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object
- `id` (number): Credit card ID

**Returns:** Promise<Object|null> - Credit card object or null

#### `createCreditCard(event, name, last4)`

Create a new credit card.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object
- `name` (string): Credit card name
- `last4` (string): Last 4 digits of card

#### `updateCreditCard(event, id, name, last4)`

Update an existing credit card.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object
- `id` (number): Credit card ID
- `name` (string): Updated credit card name
- `last4` (string): Updated last 4 digits

#### `deleteCreditCard(event, id)`

Delete a credit card by ID.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object
- `id` (number): Credit card ID

### Billing Cycle Operations

#### `listBillingCycles(event)`

List all billing cycles ordered by start date.

**Returns:** Promise<Array> - Array of billing cycle objects

#### `getBillingCycle(event, id)`

Get a single billing cycle by ID.

**Returns:** Promise<Object|null> - Billing cycle object or null

#### `createBillingCycle(event, start_date, end_date)`

Create a new billing cycle.

**Parameters:**

- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format

#### `deleteBillingCycle(event, id)`

Delete a billing cycle by ID.

### Budget Operations

#### `listBudgets(event)`

List all budgets.

**Returns:** Promise<Array> - Array of budget objects

#### `getBudget(event, id)`

Get a single budget by ID.

**Returns:** Promise<Object|null> - Budget object or null

#### `createBudget(event, name)`

Create a new budget.

**Parameters:**

- `name` (string): Budget name

#### `updateBudget(event, id, name)`

Update an existing budget.

#### `deleteBudget(event, id)`

Delete a budget by ID.

#### `addBudgetMerchant(event, budget_id, merchant)`

Add a merchant to a budget.

#### `removeBudgetMerchant(event, budget_id, merchant)`

Remove a merchant from a budget.

#### `getBudgetMerchants(event, budget_id)`

Get all merchants for a budget.

### Statement Operations

#### `listStatements(event, billing_cycle_id)`

List all statements for a billing cycle.

**Parameters:**

- `billing_cycle_id` (number): Billing cycle ID

**Returns:** Promise<Array> - Array of statement objects

#### `getStatement(event, id)`

Get a single statement by ID.

**Returns:** Promise<Object|null> - Statement object or null

#### `createStatement(event, billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key)`

Create a new statement.

**Parameters:**

- `billing_cycle_id` (number): Billing cycle ID
- `credit_card_id` (number): Credit card ID
- `filename` (string): Original filename
- `r2_key` (string): R2 storage key
- `statement_date` (string): Statement date
- `image_key` (string, optional): Image storage key

#### `updateStatementImageKey(event, id, image_key)`

Update the image key for a statement.

#### `updateStatementCreditCard(event, id, credit_card_id)`

Update the credit card for a statement.

#### `updateStatementDate(event, id, statement_date)`

Update the statement date.

#### `deleteStatement(event, id)`

Delete a statement by ID.

### Payment Operations

#### `createPayment(event, statement_id, merchant, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type)`

Create a new payment record.

**Parameters:**

- `statement_id` (number): Statement ID
- `merchant` (string): Merchant name
- `amount` (number): Payment amount
- `allocated_to` (string, optional): Budget allocation
- `transaction_date` (string, optional): Transaction date
- `is_foreign_currency` (boolean, optional): Foreign currency flag
- `foreign_currency_amount` (number, optional): Foreign currency amount
- `foreign_currency_type` (string, optional): Foreign currency type

#### `listChargesForCycle(event, billing_cycle_id)`

List all charges for a billing cycle.

**Returns:** Promise<Array> - Array of payment objects

#### `getPayment(event, id)`

Get a single payment by ID.

**Returns:** Promise<Object|null> - Payment object or null

#### `updatePayment(event, id, merchant, amount, allocated_to)`

Update an existing payment.

#### `bulkAssignPayments(event, assignments)`

Bulk assign payments to budgets.

**Parameters:**

- `assignments` (Array): Array of { payment_id, allocated_to } objects

#### `deletePaymentsForStatement(event, statement_id)`

Delete all payments for a statement.

### Usage Examples

```javascript
import {
	listCreditCards,
	createCreditCard,
	listBillingCycles,
	createPayment
} from '$lib/server/ccbilling-db.js';

// List all credit cards
const cards = await listCreditCards(event);

// Create a new credit card
await createCreditCard(event, 'Chase Freedom', '1234');

// List billing cycles
const cycles = await listBillingCycles(event);

// Create a payment
await createPayment(event, statementId, 'Amazon', 99.99, 'Shopping');
```

## require-user.js

Provides authentication utilities for server routes.

### Functions

#### `requireUser(event)`

Throws a 401 Response if the user is not authenticated.

**Parameters:**

- `event` (RequestEvent): SvelteKit event object

**Returns:** Promise<Object|Response> - User object or error response

**Features:**

- Development testing bypass with `x-dev-test` header
- Cookie-based authentication
- KV store token validation

### Usage Examples

```javascript
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		return authResult; // User not authenticated
	}
	// User is authenticated, proceed with request
}
```

## route-utils.js

Provides shared utilities for server route handlers.

### Functions

#### `handleAuth(event)`

Handle authentication for a route.

**Returns:** Object|Response - User object or error response

#### `validateParams(params, requiredFields, options)`

Validate route parameters.

**Parameters:**

- `params` (Object): Route parameters
- `requiredFields` (Array): Required field names
- `options` (Object): Validation options
  - `validators` (Object): Custom validators for each field

**Returns:** Object - Validated parameters or error response

#### `parseInteger(value, paramName, options)`

Parse and validate integer parameter.

**Parameters:**

- `value` (string): Parameter value
- `paramName` (string): Parameter name for error messages
- `options` (Object): Validation options
  - `min` (number): Minimum value
  - `max` (number): Maximum value

**Returns:** number|string - Parsed integer or error message

#### `handleError(error, context, options)`

Handle errors in route handlers.

**Parameters:**

- `error` (Error): Error object
- `context` (string): Context for error logging
- `options` (Object): Error handling options
  - `logError` (boolean): Whether to log the error (default: true)
  - `defaultStatus` (number): Default HTTP status code (default: 500)

**Returns:** Response - Error response

#### `createSuccessResponse(data, message, options)`

Create a standardized success response.

#### `createErrorResponse(message, options)`

Create a standardized error response.

#### `validateBody(body, requiredFields, options)`

Validate request body.

#### `parseRequestBody(request, options)`

Parse and validate request body.

#### `createRouteHandler(handler, options)`

Create a standardized route handler with error handling.

### Usage Examples

```javascript
import { RouteUtils } from '$lib/server/route-utils.js';

export async function GET(event) {
	// Handle authentication
	const authResult = await RouteUtils.handleAuth(event);
	if (authResult instanceof Response) {
		return authResult;
	}

	// Validate parameters
	const validation = RouteUtils.validateParams(event.params, ['id']);
	if (validation.error) {
		return RouteUtils.createErrorResponse(validation.error, { status: validation.status });
	}

	try {
		const data = await getCreditCard(event, validation.params.id);
		return RouteUtils.createSuccessResponse(data);
	} catch (error) {
		return RouteUtils.handleError(error, 'GET /credit-card/[id]');
	}
}
```

## user-validation.js

Provides user validation logic with development guidance.

### Functions

#### `isUserAllowed(email, kv)`

Checks if a user email is allowed access.

**Parameters:**

- `email` (string): User's email address
- `kv` (any): KV store instance

**Returns:** Promise<boolean> - Whether the user is allowed

**Features:**

- Enhanced logging with development guidance
- Provides commands to add users for development/production

### Usage Examples

```javascript
import { isUserAllowed } from '$lib/server/user-validation.js';

const isAllowed = await isUserAllowed(email, event.platform.env.KV);
if (!isAllowed) {
	return new Response('Unauthorized', { status: 401 });
}
```

## Server Dependencies

These utilities require the following server-side APIs:

- **ccbilling-db.js**: Cloudflare D1 database, SvelteKit RequestEvent
- **require-user.js**: Cloudflare KV, SvelteKit cookies, RequestEvent
- **route-utils.js**: SvelteKit RequestEvent, Response objects
- **user-validation.js**: Cloudflare KV store

## Testing

Unit tests are available for all utilities:

- `ccbilling-db.test.js`

## Database Schema

The utilities work with the following database tables:

- `credit_card` - Credit card information
- `billing_cycle` - Billing cycle periods
- `budget` - Budget categories
- `budget_merchant` - Budget merchant associations
- `statement` - Credit card statements
- `payment` - Individual payment transactions
