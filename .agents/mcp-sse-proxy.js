const http = require('http');
const readline = require('readline');

const sseUrlStr = process.argv[2] || 'http://host.docker.internal:9876/sse';
console.error(`[Proxy] Connecting to SSE at ${sseUrlStr}...`);

let postUrl = null;
const messageQueue = [];

// Read JSON-RPC from stdin line-by-line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  if (postUrl) {
    sendPost(line);
  } else {
    messageQueue.push(line);
  }
});

// Establish SSE GET connection
let sseReq = null;

function connectSSE() {
  const url = new URL(sseUrlStr);
  const options = {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  };

  sseReq = http.request(url, options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`[Proxy] SSE Server returned status ${res.statusCode}`);
      process.exit(1);
    }

    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      let lines = buffer.split(/\r?\n/);
      // Keep the last incomplete line in buffer
      buffer = lines.pop();

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (eventType === 'endpoint') {
            postUrl = new URL(data, url).toString();
            console.error(`[Proxy] Received POST endpoint: ${postUrl}`);
            // Flush queued messages
            while (messageQueue.length > 0) {
              sendPost(messageQueue.shift());
            }
          } else if (eventType === 'message' || eventType === '') {
            // Forward message to stdout
            process.stdout.write(data + '\n');
          }
        } else if (line === '') {
          eventType = '';
        }
      }
    });

    res.on('end', () => {
      console.error('[Proxy] SSE stream ended by server');
      process.exit(0);
    });
  });

  sseReq.on('error', (e) => {
    console.error(`[Proxy] SSE request error: ${e.message}`);
    process.exit(1);
  });

  sseReq.end();
}

function sendPost(payload) {
  if (!postUrl) return;
  
  const url = new URL(postUrl);
  const postData = Buffer.from(payload, 'utf8');
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  const req = http.request(url, options, (res) => {
    // Consume response data to free socket
    res.resume();
    if (res.statusCode >= 400) {
      console.error(`[Proxy] POST failed with status ${res.statusCode}`);
    }
  });

  req.on('error', (e) => {
    console.error(`[Proxy] POST error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

connectSSE();
