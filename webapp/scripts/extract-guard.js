import fs from 'fs';

const filePath = './node_modules/@sveltejs/kit/src/exports/vite/index.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('sveltekit-guard')) {
    console.log(`--- Line ${i + 1} ---`);
    const start = Math.max(0, i - 15);
    const end = Math.min(lines.length, i + 35);
    for (let j = start; j < end; j++) {
      console.log(`${j + 1}: ${lines[j]}`);
    }
  }
}
