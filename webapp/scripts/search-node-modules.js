import fs from 'fs';
import path from 'path';

function searchDirectory(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules') {
        searchDirectory(filePath, query);
      }
    } else if (stat.isFile()) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found "${query}" in: ${filePath}`);
      }
    }
  }
}

searchDirectory('./node_modules/@sveltejs/kit', 'sveltekit-guard');
