const http = require('http');
const https = require('https');
const readline = require('readline');

const targetUrlStr = process.argv[2] || 'http://nas:5230/mcp';
const token = process.env.MEMOS_TOKEN || '';
let sessionId = '';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  const url = new URL(targetUrlStr);
  const postData = Buffer.from(trimmed, 'utf8');
  const client = url.protocol === 'https:' ? https : http;
  const agent = url.protocol === 'https:' ? httpsAgent : httpAgent;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Content-Length': postData.length
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const req = client.request(url, {
    method: 'POST',
    agent: agent,
    headers: headers
  }, (res) => {
    if (res.headers['mcp-session-id']) {
      sessionId = res.headers['mcp-session-id'];
    }
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString();
    });
    res.on('end', () => {
      const lines = body.split('\n');
      for (const l of lines) {
        const t = l.trim();
        if (t) {
          if (t.startsWith('data: ')) {
            process.stdout.write(t.slice(6) + '\n');
          } else if (t.startsWith('{')) {
            process.stdout.write(t + '\n');
          }
        }
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[StreamableHttpProxy Error] ${err.message}`);
  });

  req.write(postData);
  req.end();
});
