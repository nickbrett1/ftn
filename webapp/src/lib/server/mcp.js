import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { products } from '$lib/data/products.js';
import { getProductById, processTestPurchase, createStripeSession } from './shop.js';
import { capabilities } from '$lib/config/capabilities.js';
import { ProjectGeneratorService } from '$lib/server/project-generator.js';
import { buildAuthTokensFromStored, buildProjectContext } from '$lib/server/genproj-api-utils.js';

function getCcbillingDb(context) {
	const db = context.platform?.env?.CCBILLING_DB || context.platform?.env?.DB;
	if (!db) {
		throw new Error('CCBILLING_DB binding not available in platform environment.');
	}
	return db;
}

export function createMcpServer(context = {}) {
	const mcpServer = new Server(
		{ name: 'fintechnick-mcp', version: '1.0.0' },
		{ capabilities: { tools: {} } }
	);

	// Register Available Tools
	mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: 'list_products',
					description: 'Returns the catalog of available products, categories, and prices.',
					inputSchema: { type: 'object', properties: {} }
				},
				{
					name: 'get_product',
					description: 'Returns metadata for a specific product by ID.',
					inputSchema: {
						type: 'object',
						properties: {
							productId: { type: 'string', description: 'ID of the product' }
						},
						required: ['productId']
					}
				},
				{
					name: 'purchase_product_direct',
					description: 'Completes a mock purchase directly via Stripe using test card credentials.',
					inputSchema: {
						type: 'object',
						properties: {
							productId: { type: 'string', description: 'ID of the product to purchase' },
							stripeToken: { type: 'string', description: 'Stripe token (defaults to tok_visa)' }
						},
						required: ['productId']
					}
				},
				{
					name: 'create_checkout_session',
					description: 'Generates a Stripe Checkout Session URL for visual completion.',
					inputSchema: {
						type: 'object',
						properties: {
							productId: { type: 'string', description: 'ID of the product' }
						},
						required: ['productId']
					}
				},
				{
					name: 'list_genproj_capabilities',
					description:
						'Returns the list of supported capabilities that can be injected into a generated project.',
					inputSchema: { type: 'object', properties: {} }
				},
				{
					name: 'generate_project',
					description: 'Triggers the generation of a new repository with selected capabilities.',
					inputSchema: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'Name of the project' },
							selectedCapabilities: {
								type: 'array',
								items: { type: 'string' },
								description: 'List of capability IDs to include'
							},
							repositoryUrl: {
								type: 'string',
								description: 'Target GitHub repository URL (optional)'
							},
							overwrite: {
								type: 'boolean',
								description:
									'Set true to generate into an existing repository (repo must exist / be pre-created for private repos). Without it, generation fails with REPOSITORY_EXISTS.'
							},
							resolutions: { type: 'object', description: 'Conflict resolutions (optional)' },
							configuration: {
								type: 'object',
								description:
									'Capability-specific configuration, e.g. { "docker-container": { "publishPort": "127.0.0.1:3000:3000", "dataMounts": [{ "hostPath": "/volume1/data", "containerPath": "/data", "readOnly": true }], "hostname": "nas.local", "aptPackages": ["iproute2", "curl"], "envVars": ["MCP_PORT=3001"], "command": ["/usr/local/bin/entrypoint.sh"], "healthcheck": "http:/healthz" }, "language": "python" } — language is normally derived from the devcontainer-* capability (optional)'
							}
						},
						required: ['name', 'selectedCapabilities']
					}
				},
				{
					name: 'list_ccbilling_transactions',
					description:
						'Returns credit card statement transactions including date, merchant, amount, and budget allocation to help identify cost-saving opportunities.',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Maximum number of transactions to return (default 50, max 200)'
							},
							startDate: {
								type: 'string',
								description: 'Filter transactions on or after this date (YYYY-MM-DD)'
							},
							endDate: {
								type: 'string',
								description: 'Filter transactions on or before this date (YYYY-MM-DD)'
							},
							allocatedTo: {
								type: 'string',
								description: 'Filter by budget name allocated to'
							},
							unallocatedOnly: {
								type: 'boolean',
								description: 'Only return transactions that are unallocated to any budget'
							},
							merchant: {
								type: 'string',
								description: 'Filter by merchant name (case-insensitive substring match)'
							}
						}
					}
				},
				{
					name: 'get_ccbilling_spending_summary',
					description:
						'Returns spending totals grouped by budget allocation and top merchants for cost optimization analysis.',
					inputSchema: {
						type: 'object',
						properties: {
							startDate: {
								type: 'string',
								description: 'Filter starting from date (YYYY-MM-DD)'
							},
							endDate: {
								type: 'string',
								description: 'Filter ending at date (YYYY-MM-DD)'
							}
						}
					}
				},
				{
					name: 'list_ccbilling_budgets',
					description: 'Lists all configured budget categories and their associated merchants.',
					inputSchema: { type: 'object', properties: {} }
				}
			]
		};
	});

	// Register Tool Execution Handler
	mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: toolArguments } = request.params;

		try {
			switch (name) {
				case 'list_products': {
					// Strip image imports from data sent to LLM to keep context token count light
					const cleanProducts = products.map(
						({ id, name: productName, description, price, currency, category }) => ({
							id,
							name: productName,
							description,
							price,
							currency,
							category
						})
					);
					return {
						content: [{ type: 'text', text: JSON.stringify(cleanProducts) }]
					};
				}
				case 'get_product': {
					const product = getProductById(toolArguments?.productId);
					if (!product) {
						return {
							isError: true,
							content: [
								{ type: 'text', text: `Product with ID "${toolArguments?.productId}" not found.` }
							]
						};
					}
					// Return clean product metadata
					const { id, name: productName, description, price, currency, category } = product;
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									id,
									name: productName,
									description,
									price,
									currency,
									category
								})
							}
						]
					};
				}
				case 'purchase_product_direct': {
					const result = await processTestPurchase(
						toolArguments?.productId,
						toolArguments?.stripeToken
					);
					return {
						content: [{ type: 'text', text: JSON.stringify(result) }]
					};
				}
				case 'create_checkout_session': {
					const origin = 'https://www.fintechnick.com';
					const result = await createStripeSession(toolArguments?.productId, origin);
					return {
						content: [{ type: 'text', text: JSON.stringify(result) }]
					};
				}
				case 'list_genproj_capabilities': {
					return {
						content: [{ type: 'text', text: JSON.stringify(capabilities) }]
					};
				}
				case 'generate_project': {
					if (!context.userEmail) {
						throw new Error('Missing authentication context for genproj tools.');
					}
					const {
						name: projectName,
						selectedCapabilities,
						repositoryUrl,
						overwrite,
						resolutions,
						configuration
					} = toolArguments;

					const authTokens = buildAuthTokensFromStored();

					const service = new ProjectGeneratorService(authTokens);
					const projectContext = buildProjectContext(
						{
							name: projectName,
							selectedCapabilities,
							repositoryUrl,
							overwrite,
							resolutions,
							configuration
						},
						context.userEmail,
						authTokens
					);

					const result = await service.generateProject(projectContext);
					if (!result.success) {
						throw new Error(result.error || 'Project generation failed');
					}

					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									message: 'Project generated successfully',
									repositoryUrl: result.repository?.htmlUrl || '',
									externalServices: result.externalServices || {}
								})
							}
						]
					};
				}
				case 'list_ccbilling_transactions': {
					const db = getCcbillingDb(context);
					const {
						limit = 50,
						startDate,
						endDate,
						allocatedTo,
						unallocatedOnly,
						merchant
					} = toolArguments || {};
					const maxLimit = Math.min(Math.max(1, limit), 200);

					let query = `
						SELECT 
							p.id, 
							p.transaction_date, 
							p.merchant, 
							p.merchant_normalized, 
							p.merchant_details, 
							p.amount, 
							p.allocated_to, 
							p.is_foreign_currency, 
							p.foreign_currency_amount, 
							p.foreign_currency_type, 
							s.filename as statement_filename, 
							cc.name as credit_card_name, 
							cc.last4 as credit_card_last4
						FROM payment p
						LEFT JOIN statement s ON p.statement_id = s.id
						LEFT JOIN credit_card cc ON s.credit_card_id = cc.id
						WHERE 1=1
					`;
					const bindings = [];

					if (startDate) {
						query += ` AND p.transaction_date >= ?`;
						bindings.push(startDate);
					}
					if (endDate) {
						query += ` AND p.transaction_date <= ?`;
						bindings.push(endDate);
					}
					if (allocatedTo) {
						query += ` AND p.allocated_to = ?`;
						bindings.push(allocatedTo);
					}
					if (unallocatedOnly) {
						query += ` AND (p.allocated_to IS NULL OR p.allocated_to = '')`;
					}
					if (merchant) {
						query += ` AND (p.merchant LIKE ? OR p.merchant_normalized LIKE ?)`;
						bindings.push(`%${merchant}%`, `%${merchant}%`);
					}

					query += ` ORDER BY p.transaction_date DESC, p.id DESC LIMIT ?`;
					bindings.push(maxLimit);

					const stmt = db.prepare(query);
					const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
					const { results } = await bound.all();

					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									count: results ? results.length : 0,
									transactions: results || []
								})
							}
						]
					};
				}
				case 'get_ccbilling_spending_summary': {
					const db = getCcbillingDb(context);
					const { startDate, endDate } = toolArguments || {};

					let dateFilter = '';
					const bindings = [];
					if (startDate) {
						dateFilter += ` AND transaction_date >= ?`;
						bindings.push(startDate);
					}
					if (endDate) {
						dateFilter += ` AND transaction_date <= ?`;
						bindings.push(endDate);
					}

					const budgetQuery = `
						SELECT 
							COALESCE(NULLIF(allocated_to, ''), 'Unallocated') as budget,
							COUNT(*) as transaction_count,
							ROUND(SUM(amount), 2) as total_amount
						FROM payment
						WHERE 1=1 ${dateFilter}
						GROUP BY COALESCE(NULLIF(allocated_to, ''), 'Unallocated')
						ORDER BY total_amount DESC
					`;
					const budgetStmt =
						bindings.length > 0
							? db.prepare(budgetQuery).bind(...bindings)
							: db.prepare(budgetQuery);
					const { results: budgetSummary } = await budgetStmt.all();

					const merchantQuery = `
						SELECT 
							merchant_normalized as merchant,
							COALESCE(NULLIF(allocated_to, ''), 'Unallocated') as budget,
							COUNT(*) as transaction_count,
							ROUND(SUM(amount), 2) as total_amount
						FROM payment
						WHERE 1=1 ${dateFilter}
						GROUP BY merchant_normalized, COALESCE(NULLIF(allocated_to, ''), 'Unallocated')
						ORDER BY total_amount DESC
						LIMIT 20
					`;
					const merchantStmt =
						bindings.length > 0
							? db.prepare(merchantQuery).bind(...bindings)
							: db.prepare(merchantQuery);
					const { results: topMerchants } = await merchantStmt.all();

					const rows = budgetSummary || [];
					const totalSpent = rows.reduce((acc, row) => acc + (row.total_amount || 0), 0);
					const totalCount = rows.reduce((acc, row) => acc + (row.transaction_count || 0), 0);

					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									total_spent: Math.round(totalSpent * 100) / 100,
									total_transactions: totalCount,
									by_budget: rows,
									top_merchants: topMerchants || []
								})
							}
						]
					};
				}
				case 'list_ccbilling_budgets': {
					const db = getCcbillingDb(context);
					const { results: budgets } = await db
						.prepare('SELECT * FROM budget ORDER BY name ASC')
						.all();
					const { results: budgetMerchants } = await db
						.prepare(
							'SELECT * FROM budget_merchant ORDER BY budget_id ASC, merchant_normalized ASC'
						)
						.all();

					const merchantsByBudget = {};
					if (budgetMerchants) {
						for (const bm of budgetMerchants) {
							if (!merchantsByBudget[bm.budget_id]) merchantsByBudget[bm.budget_id] = [];
							merchantsByBudget[bm.budget_id].push(bm.merchant_normalized);
						}
					}

					const budgetList = (budgets || []).map((b) => ({
						id: b.id,
						name: b.name,
						icon: b.icon,
						merchants: merchantsByBudget[b.id] || []
					}));

					return {
						content: [{ type: 'text', text: JSON.stringify({ budgets: budgetList }) }]
					};
				}
				default: {
					throw new Error(`Tool not found: ${name}`);
				}
			}
		} catch (error) {
			return {
				isError: true,
				content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
			};
		}
	});

	return mcpServer;
}
