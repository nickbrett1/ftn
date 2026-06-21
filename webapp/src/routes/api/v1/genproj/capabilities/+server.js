import { json } from '@sveltejs/kit';
import { capabilities } from '$lib/config/capabilities';
import { validatePatAuth } from '$lib/server/genproj-api-utils';

export async function GET({ request, platform }) {
	try {
		// 1. Verify PAT from Authorization header
		const { errorResponse } = await validatePatAuth(request, platform);
		if (errorResponse) return errorResponse;

		// 2. Return capabilities
		return json({
			message: 'Capabilities retrieved successfully',
			capabilities
		});
	} catch (error) {
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
