// webapp/src/routes/projects/genproj/api/preview/+server.js
import { json } from '@sveltejs/kit';
import { generatePreview } from '$lib/server/preview-generator';
import { logger } from '$lib/utils/logging';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { projectConfig, selectedCapabilities } = await request.json();

		if (!projectConfig || !selectedCapabilities) {
			return json({ error: 'Missing projectConfig or selectedCapabilities' }, { status: 400 });
		}

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		return json(previewData, { status: 200 });
	} catch (error) {
		logger.error('Error generating preview:', error);
		return json({ error: 'Failed to generate preview', details: error.message }, { status: 500 });
	}
}
