const http = require('http');
const https = require('https');
const readline = require('readline');

const targetUrlStr = process.argv[2] || 'http://nas:5230/mcp';
const token = process.env.MEMOS_TOKEN || '';
let sessionId = '';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const queue = [];
let isProcessing = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  queue.push(trimmed);
  processQueue();
});

function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const line = queue.shift();
  let reqId = null;
  try {
    const parsedReq = JSON.parse(line);
    if (parsedReq && parsedReq.id !== undefined) {
      reqId = parsedReq.id;
    }
  } catch (e) {}

  const url = new URL(targetUrlStr);
  const postData = Buffer.from(line, 'utf8');
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
      const contentType = res.headers['content-type'] || '';

      if (res.statusCode >= 400) {
        let handled = false;
        try {
          const parsedErr = JSON.parse(body.trim());
          if (parsedErr && (parsedErr.jsonrpc || parsedErr.error)) {
            process.stdout.write(JSON.stringify(parsedErr) + '\n');
            handled = true;
          }
        } catch (e) {}

        if (!handled && reqId !== null) {
          const jsonRpcErr = {
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32601,
              message: body.trim() || `HTTP ${res.statusCode} Error`
            }
          };
          process.stdout.write(JSON.stringify(jsonRpcErr) + '\n');
        }
      } else if (contentType.includes('text/event-stream')) {
        const lines = body.split(/\r?\n/);
        for (const l of lines) {
          const t = l.trim();
          if (t.startsWith('data:')) {
            const dataStr = t.slice(5).trim();
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                process.stdout.write(JSON.stringify(parsed) + '\n');
              } catch (e) {
                process.stdout.write(dataStr + '\n');
              }
            }
          }
        }
      } else {
        const trimmedBody = body.trim();
        if (trimmedBody) {
          try {
            const parsed = JSON.parse(trimmedBody);
            process.stdout.write(JSON.stringify(parsed) + '\n');
          } catch (e) {
            if (reqId !== null) {
              const jsonRpcErr = {
                jsonrpc: '2.0',
                id: reqId,
                error: {
                  code: -32700,
                  message: 'Parse error: non-JSON response from server'
                }
              };
              process.stdout.write(JSON.stringify(jsonRpcErr) + '\n');
            }
          }
        }
      }

      isProcessing = false;
      processQueue();
    });
  });

  req.on('error', (err) => {
    if (reqId !== null) {
      const jsonRpcErr = {
        jsonrpc: '2.0',
        id: reqId,
        error: {
          code: -32603,
          message: `Internal proxy error: ${err.message}`
        }
      };
      process.stdout.write(JSON.stringify(jsonRpcErr) + '\n');
    }
    isProcessing = false;
    processQueue();
  });

  req.write(postData);
  req.end();
}
