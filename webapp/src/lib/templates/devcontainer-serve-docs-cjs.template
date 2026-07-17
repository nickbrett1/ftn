const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DOCS_DIR = path.resolve(__dirname, '../docs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.excalidraw': 'application/json',
  '.mmd': 'text/plain'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  
  // Custom API endpoint to list all docs & specs files recursively
  if (pathname === '/api/docs') {
    try {
      const scanDir = (dir, baseDir) => {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          if (file.startsWith('.')) continue;
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            const children = scanDir(filePath, baseDir);
            if (children.length > 0) {
              results.push({
                name: file,
                type: 'directory',
                children
              });
            }
          } else {
            const ext = path.extname(file);
            if (ext === '.md' || ext === '.excalidraw' || ext === '.mmd') {
              results.push({
                name: file,
                type: 'file',
                relativePath: path.relative(baseDir, filePath)
              });
            }
          }
        }
        return results;
      };
      
      const docsTree = scanDir(DOCS_DIR, DOCS_DIR);
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      });
      res.end(JSON.stringify(docsTree));
      return;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(e.message);
      return;
    }
  }

  // Serve static files
  let filePath = path.join(DOCS_DIR, pathname);
  
  // Normalize path and prevent directory traversal escape
  if (!filePath.startsWith(DOCS_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Handle directory requests by serving index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  res.writeHead(200, { 
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Docsify server running at http://localhost:${PORT}`);
});
