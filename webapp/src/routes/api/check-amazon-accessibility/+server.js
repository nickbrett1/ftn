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
		
		// Make a HEAD request to Amazon from our server
		// This avoids CORS issues since the request comes from our backend
		const response = await fetch(url, {
			method: 'HEAD',
			redirect: 'manual', // Don't follow redirects automatically
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; AmazonOrderChecker/1.0)'
			}
		});
		
		// Check if we got a redirect (3xx status)
		const isRedirected = response.status >= 300 && response.status < 400;
		const isAccessible = response.status === 200;
		
		return json({
			success: true,
			accessible: isAccessible,
			redirected: isRedirected,
			status: response.status,
			finalUrl: response.url,
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