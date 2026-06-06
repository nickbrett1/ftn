import fs from 'fs';

const filePath = './node_modules/@sveltejs/kit/src/exports/vite/index.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let j = 704; j < 760; j++) {
  console.log(`${j + 1}: ${lines[j]}`);
}
