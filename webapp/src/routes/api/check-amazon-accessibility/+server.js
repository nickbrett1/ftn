import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { url } = await request.json();
		
		if (!url || !url.includes('amazon.com')) {
			return json({ 
				success: false, 
				error: 'Invalid Amazon URL' 
			}, { status: 400 });
		}
		
		// Make a GET request to Amazon from our server
		// This avoids CORS issues since the request comes from our backend
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'manual', // Don't follow redirects automatically
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; AmazonOrderChecker/1.0)'
			}
		});
		
		// Get response details
		const status = response.status;
		const finalUrl = response.url;
		const headers = Object.fromEntries(response.headers.entries());
		
		// Check for redirect indicators
		const hasLocationHeader = headers.location || headers.Location;
		const isRedirectStatus = status >= 300 && status < 400;
		const urlChanged = finalUrl !== url;
		
		// Log what we're seeing for debugging
		console.log('Amazon response details:', {
			originalUrl: url,
			finalUrl: finalUrl,
			status: status,
			hasLocationHeader: hasLocationHeader,
			locationHeader: headers.location || headers.Location,
			urlChanged: urlChanged,
			allHeaders: headers
		});
		
		// An order is accessible if:
		// 1. We get a 200 status (direct access)
		// 2. No redirect headers or status codes
		// 3. URL didn't change
		const isAccessible = status === 200 && !isRedirectStatus && !hasLocationHeader && !urlChanged;
		
		return json({
			success: true,
			accessible: isAccessible,
			redirected: isRedirectStatus || hasLocationHeader || urlChanged,
			status: status,
			finalUrl: finalUrl,
			urlChanged: urlChanged,
			hasLocationHeader: hasLocationHeader,
			locationHeader: headers.location || headers.Location,
			error: null
		});
		
	} catch (error) {
		console.error('Error checking Amazon accessibility:', error);
		
		return json({
			success: false,
			accessible: false,
			redirected: false,
			status: null,
			finalUrl: null,
			error: error.message
		}, { status: 500 });
	}
}