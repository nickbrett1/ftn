import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, '../.svelte-kit/cloudflare/_worker.js');
const dir = path.dirname(workerPath);

if (!fs.existsSync(workerPath)) {
	console.log('Creating placeholder _worker.js for Cloudflare Vite plugin...');
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(workerPath, 'export default { fetch: () => new Response("Placeholder") };');
}
