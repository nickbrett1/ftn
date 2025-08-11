"""
Amazon Orders Worker for Cloudflare Workers
Fetches detailed order information from Amazon using order identifiers
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import hashlib

# Note: In actual deployment, you'll need to handle the amazon-orders import
# The library may need adaptation for Cloudflare Workers Python runtime
try:
    from amazon_orders import AmazonOrders
except ImportError:
    # Fallback for development/testing
    AmazonOrders = None


class AmazonOrderService:
    """Service for fetching Amazon order details"""
    
    def __init__(self, email: str, password: str, cache_kv=None, orders_db=None):
        self.email = email
        self.password = password
        self.cache_kv = cache_kv
        self.orders_db = orders_db
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of Amazon client"""
        if not self._client and AmazonOrders:
            self._client = AmazonOrders(
                username=self.email,
                password=self.password,
                headless=True  # Required for server environment
            )
        return self._client
    
    def extract_order_id(self, merchant_string: str) -> Optional[str]:
        """
        Extract Amazon order ID from merchant string
        
        Common patterns:
        - AMAZON.COM*123-4567890-1234567
        - AMZN.COM/BILL 123-4567890-1234567
        - Amazon.com 1234567890123456
        """
        # Pattern for standard Amazon order IDs (XXX-XXXXXXX-XXXXXXX)
        standard_pattern = r'\b(\d{3}-\d{7}-\d{7})\b'
        
        # Pattern for compact order IDs (16 digits)
        compact_pattern = r'\b(\d{16})\b'
        
        # Try standard pattern first
        match = re.search(standard_pattern, merchant_string)
        if match:
            return match.group(1)
        
        # Try compact pattern
        match = re.search(compact_pattern, merchant_string)
        if match:
            return match.group(1)
        
        # Try to extract any long number sequence that might be an order ID
        number_pattern = r'\b(\d{10,})\b'
        match = re.search(number_pattern, merchant_string)
        if match:
            return match.group(1)
        
        return None
    
    async def get_cache_key(self, order_id: str) -> str:
        """Generate cache key for order"""
        return f"amazon_order:{order_id}"
    
    async def get_cached_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached order data"""
        if not self.cache_kv:
            return None
        
        cache_key = await self.get_cache_key(order_id)
        cached_data = await self.cache_kv.get(cache_key, "json")
        
        if cached_data:
            # Check if cache is still valid (24 hours)
            cache_time = datetime.fromisoformat(cached_data.get('cached_at', ''))
            if datetime.now() - cache_time < timedelta(hours=24):
                return cached_data.get('order_data')
        
        return None
    
    async def cache_order(self, order_id: str, order_data: Dict[str, Any]):
        """Cache order data"""
        if not self.cache_kv:
            return
        
        cache_key = await self.get_cache_key(order_id)
        cache_data = {
            'order_data': order_data,
            'cached_at': datetime.now().isoformat()
        }
        
        # Cache for 24 hours
        await self.cache_kv.put(cache_key, json.dumps(cache_data), {"expirationTtl": 86400})
    
    async def fetch_order_details(self, order_id: str) -> Dict[str, Any]:
        """
        Fetch order details from Amazon
        
        Returns:
            Dictionary containing order information including:
            - order_id: The order identifier
            - order_date: Date of the order
            - total_amount: Total order amount
            - items: List of items in the order
            - status: Order status
        """
        # Check cache first
        cached = await self.get_cached_order(order_id)
        if cached:
            return cached
        
        if not AmazonOrders:
            # Return mock data if library not available
            return {
                'order_id': order_id,
                'error': 'Amazon Orders library not available',
                'mock_data': True,
                'items': [
                    {'name': 'Sample Item', 'price': 0.00, 'quantity': 1}
                ]
            }
        
        try:
            # Fetch order from Amazon
            order = self.client.get_order(order_id)
            
            if not order:
                return {
                    'order_id': order_id,
                    'error': 'Order not found',
                    'found': False
                }
            
            # Parse order details
            order_data = {
                'order_id': order_id,
                'order_date': order.get('date', ''),
                'total_amount': order.get('total', 0.0),
                'status': order.get('status', 'Unknown'),
                'items': []
            }
            
            # Extract items
            for item in order.get('items', []):
                order_data['items'].append({
                    'name': item.get('title', 'Unknown Item'),
                    'price': item.get('price', 0.0),
                    'quantity': item.get('quantity', 1),
                    'asin': item.get('asin', ''),
                    'link': item.get('link', '')
                })
            
            # Cache the result
            await self.cache_order(order_id, order_data)
            
            return order_data
            
        except Exception as e:
            return {
                'order_id': order_id,
                'error': str(e),
                'found': False
            }
    
    async def save_to_database(self, order_data: Dict[str, Any]):
        """Save order data to D1 database"""
        if not self.orders_db:
            return
        
        # Create table if not exists
        await self.orders_db.prepare("""
            CREATE TABLE IF NOT EXISTS amazon_orders (
                order_id TEXT PRIMARY KEY,
                order_date TEXT,
                total_amount REAL,
                status TEXT,
                items TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """).run()
        
        # Upsert order data
        await self.orders_db.prepare("""
            INSERT OR REPLACE INTO amazon_orders 
            (order_id, order_date, total_amount, status, items, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """).bind(
            order_data['order_id'],
            order_data.get('order_date', ''),
            order_data.get('total_amount', 0.0),
            order_data.get('status', ''),
            json.dumps(order_data.get('items', []))
        ).run()


async def handle_request(request, env, ctx):
    """Main request handler for Cloudflare Worker"""
    
    # Parse URL
    url = request.url
    path = url.pathname
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return Response(None, {'headers': headers})
    
    # Initialize service
    service = AmazonOrderService(
        email=env.get('AMAZON_EMAIL', ''),
        password=env.get('AMAZON_PASSWORD', ''),
        cache_kv=env.get('AMAZON_CACHE'),
        orders_db=env.get('ORDERS_DB')
    )
    
    # Route: /parse - Extract order ID from merchant string
    if path == '/parse' and request.method == 'POST':
        try:
            body = await request.json()
            merchant_string = body.get('merchant', '')
            
            order_id = service.extract_order_id(merchant_string)
            
            return Response(
                json.dumps({
                    'success': True,
                    'merchant': merchant_string,
                    'order_id': order_id,
                    'found': order_id is not None
                }),
                {'headers': headers}
            )
        except Exception as e:
            return Response(
                json.dumps({'success': False, 'error': str(e)}),
                {'status': 500, 'headers': headers}
            )
    
    # Route: /order/:id - Get order details
    if path.startswith('/order/'):
        order_id = path.replace('/order/', '')
        
        if not order_id:
            return Response(
                json.dumps({'success': False, 'error': 'Order ID required'}),
                {'status': 400, 'headers': headers}
            )
        
        try:
            order_data = await service.fetch_order_details(order_id)
            
            # Save to database if successful
            if not order_data.get('error'):
                await service.save_to_database(order_data)
            
            return Response(
                json.dumps({
                    'success': not order_data.get('error'),
                    'data': order_data
                }),
                {'headers': headers}
            )
        except Exception as e:
            return Response(
                json.dumps({'success': False, 'error': str(e)}),
                {'status': 500, 'headers': headers}
            )
    
    # Route: /bulk - Process multiple merchant strings
    if path == '/bulk' and request.method == 'POST':
        try:
            body = await request.json()
            merchants = body.get('merchants', [])
            
            results = []
            for merchant in merchants:
                order_id = service.extract_order_id(merchant)
                result = {
                    'merchant': merchant,
                    'order_id': order_id,
                    'found': order_id is not None
                }
                
                # Optionally fetch details if requested
                if order_id and body.get('fetch_details', False):
                    order_data = await service.fetch_order_details(order_id)
                    result['order_details'] = order_data
                
                results.append(result)
            
            return Response(
                json.dumps({
                    'success': True,
                    'results': results
                }),
                {'headers': headers}
            )
        except Exception as e:
            return Response(
                json.dumps({'success': False, 'error': str(e)}),
                {'status': 500, 'headers': headers}
            )
    
    # Route: /health - Health check
    if path == '/health':
        return Response(
            json.dumps({
                'status': 'healthy',
                'has_credentials': bool(env.get('AMAZON_EMAIL')),
                'has_cache': bool(env.get('AMAZON_CACHE')),
                'has_database': bool(env.get('ORDERS_DB')),
                'library_available': AmazonOrders is not None
            }),
            {'headers': headers}
        )
    
    # Default 404
    return Response(
        json.dumps({'error': 'Not found'}),
        {'status': 404, 'headers': headers}
    )


# Cloudflare Worker entry point
async def on_fetch(request, env, ctx):
    """Entry point for Cloudflare Worker"""
    return await handle_request(request, env, ctx)
