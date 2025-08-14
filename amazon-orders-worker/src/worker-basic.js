/**
 * Basic Amazon Orders Worker (JavaScript version)
 * This can be deployed to Cloudflare Workers
 * For full Python functionality, use the local development version
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		// CORS headers
		const headers = {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		};
		
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers });
		}
		
		// Route: /health - Health check
		if (path === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				message: 'Amazon Orders Worker (Basic JS version)',
				has_credentials: Boolean(env.AMAZON_EMAIL),
				has_cache: Boolean(env.AMAZON_CACHE),
				has_database: Boolean(env.ORDERS_DB),
				note: 'This is a basic version. Use local Python worker for full functionality.'
			}), { headers });
		}
		
		// Route: /parse - Extract order ID from merchant string
		if (path === '/parse' && request.method === 'POST') {
			try {
				const body = await request.json();
				const merchant = body.merchant || '';
				
				const orderId = extractAmazonOrderId(merchant);
				
				return new Response(JSON.stringify({
					success: true,
					merchant: merchant,
					order_id: orderId,
					found: orderId !== null
				}), { headers });
			} catch (error) {
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), { status: 500, headers });
			}
		}
		
		// Route: /order/:id - Get order details (mock for now)
		if (path.startsWith('/order/')) {
			const orderId = path.replace('/order/', '');
			
			if (!orderId) {
				return new Response(JSON.stringify({
					success: false,
					error: 'Order ID required'
				}), { status: 400, headers });
			}
			
			// Return mock data for now
			const mockOrder = {
				order_id: orderId,
				order_date: new Date().toISOString().split('T')[0],
				total_amount: 49.99,
				status: 'Delivered',
				items: [
					{
						name: 'Sample Product (Mock Data)',
						price: 49.99,
						quantity: 1,
						asin: 'B08MOCK123'
					}
				],
				note: 'This is mock data. Use local Python worker for real Amazon data.'
			};
			
			return new Response(JSON.stringify({
				success: true,
				data: mockOrder
			}), { headers });
		}
		
		// Route: /bulk - Process multiple merchant strings
		if (path === '/bulk' && request.method === 'POST') {
			try {
				const body = await request.json();
				const merchants = body.merchants || [];
				
				const results = merchants.map(merchant => {
					const orderId = extractAmazonOrderId(merchant);
					return {
						merchant: merchant,
						order_id: orderId,
						found: orderId !== null
					};
				});
				
				return new Response(JSON.stringify({
					success: true,
					results: results
				}), { headers });
			} catch (error) {
				return new Response(JSON.stringify({
					success: false,
					error: error.message
				}), { status: 500, headers });
			}
		}
		
		// Default 404
		return new Response(JSON.stringify({
			error: 'Not found',
			available_endpoints: [
				'GET /health',
				'POST /parse',
				'GET /order/:id',
				'POST /bulk'
			]
		}), { status: 404, headers });
	}
};

/**
 * Extract Amazon order ID from merchant string
 */
function extractAmazonOrderId(merchantString) {
	if (!merchantString) return null;
	
	// Common Amazon merchant patterns
	const isAmazon = merchantString.toUpperCase().includes('AMAZON') || 
					 merchantString.toUpperCase().includes('AMZN');
	
	if (!isAmazon) return null;
	
	// Pattern for standard Amazon order IDs (XXX-XXXXXXX-XXXXXXX)
	const standardPattern = /\b(\d{3}-\d{7}-\d{7})\b/;
	let match = merchantString.match(standardPattern);
	if (match) return match[1];
	
	// Pattern for compact order IDs (16 digits)
	const compactPattern = /\b(\d{16})\b/;
	match = merchantString.match(compactPattern);
	if (match) return match[1];
	
	// Try to extract any long number sequence that might be an order ID
	const numberPattern = /\b(\d{10,})\b/;
	match = merchantString.match(numberPattern);
	if (match) return match[1];
	
	return null;
}
