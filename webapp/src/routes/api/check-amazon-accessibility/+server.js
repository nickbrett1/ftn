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
		
		// Check if we got a redirect (3xx status) or if the final URL is different
		const isRedirected = response.status >= 300 && response.status < 400;
		const finalUrl = response.url;
		const urlChanged = finalUrl !== url;
		
		// An order is accessible if:
		// 1. We get a 200 status (direct access)
		// 2. The URL didn't change (we're still on the order page)
		// 3. We didn't get a redirect status
		const isAccessible = response.status === 200 && !urlChanged && !isRedirected;
		
		return json({
			success: true,
			accessible: isAccessible,
			redirected: isRedirected || urlChanged,
			status: response.status,
			finalUrl: finalUrl,
			urlChanged: urlChanged,
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