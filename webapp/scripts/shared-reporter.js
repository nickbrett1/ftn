import http from 'http';

// Initialize global state to share across re-instantiations of the reporter class
globalThis.__sharedRunnerState = globalThis.__sharedRunnerState || {
  status: 'idle',
  results: null,
  ctx: null,
  server: null
};

const state = globalThis.__sharedRunnerState;

export default class SharedRunnerReporter {
  onInit(vitest) {
    state.ctx = vitest;
    
    // Only start the server once globally
    if (state.server) return;

    state.server = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.url === '/status') {
        res.statusCode = 200;
        res.end(JSON.stringify({ status: state.status, results: state.results }));
      } else if (req.url === '/run' && req.method === 'POST') {
        res.statusCode = 200;
        res.end(JSON.stringify({ status: 'triggered' }));
        
        // Trigger a Vitest run programmatically
        try {
          if (state.ctx) {
            await state.ctx.start();
          }
        } catch (err) {
          console.error('[SharedRunnerReporter] Error triggering test run:', err);
        }
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    // Handle port in use gracefully
    state.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn('[SharedRunnerReporter] Port 51204 is already in use. Shared runner API not started.');
      } else {
        console.error('[SharedRunnerReporter] Server error:', err);
      }
    });

    state.server.listen(51204, '127.0.0.1', () => {
      console.log('[SharedRunnerReporter] Shared test runner API listening on http://127.0.0.1:51204');
    });

    // Don't block process exit when the user terminates Vitest
    state.server.unref();
  }

  onTestRunStart() {
    state.status = 'running';
  }

  onFinished(files, errors) {
    // Determine overall success/failure
    const hasErrors = (errors && errors.length > 0) || 
                      (files && files.some(f => f.result?.state === 'fail' || (f.tasks && f.tasks.some(t => t.result?.state === 'fail'))));

    state.status = hasErrors ? 'failed' : 'passed';

    // Count passed, failed, and total tests
    let passed = 0;
    let failed = 0;
    let total = 0;

    const countTasks = (tasks) => {
      for (const task of tasks || []) {
        if (task.type === 'test') {
          total++;
          if (task.result?.state === 'pass') passed++;
          else if (task.result?.state === 'fail') failed++;
        } else if (task.type === 'suite') {
          countTasks(task.tasks);
        }
      }
    };

    for (const file of files || []) {
      countTasks(file.tasks);
    }

    state.results = {
      passed,
      failed,
      total,
      time: new Date().toISOString(),
      errors: errors?.map(e => e.message || e.toString()) || []
    };
  }
}
