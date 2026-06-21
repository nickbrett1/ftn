import fs from 'fs';
const f1 = 'webapp/src/routes/api/v1/genproj/+server.js';
const f2 = 'webapp/src/routes/projects/genproj/api/generate/+server.js';

const code1 = fs.readFileSync(f1, 'utf8');
const code2 = fs.readFileSync(f2, 'utf8');

// The duplicate lines are from the body parsing and error handling, let's extract them into a shared utility function.
