// webapp/src/routes/projects/genproj/api/preview/+server.js
import { json } from '@sveltejs/kit';
import { generatePreview } from '$lib/server/preview-generator';
import { logger } from '$lib/utils/logging';
export async function POST({ request, platform }) {
	try {
		const requestBody = await request.json();
		const { selectedCapabilities } = requestBody;
		const projectConfig = requestBody; // The entire request body is the projectConfig

		if (!projectConfig || !selectedCapabilities) {
			return json({ error: 'Missing projectConfig or selectedCapabilities' }, { status: 400 });
		}

		const previewData = await generatePreview(
			projectConfig,
			selectedCapabilities,
			platform?.env?.R2_TEMPLATES_BUCKET
		); // Pass r2Bucket

		return json(previewData, { status: 200 });
	} catch (error) {
		logger.error('Error generating preview:', error);
		return json({ error: 'Failed to generate preview', details: error.message }, { status: 500 });
	}
}
