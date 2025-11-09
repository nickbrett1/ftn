// webapp/src/routes/test-api/+server.js
import { json } from '@sveltejs/kit';

export async function GET() {
    return json({ message: 'Test API endpoint is working!' });
}