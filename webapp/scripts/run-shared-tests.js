import http from 'http';
import { spawn } from 'child_process';

const PORT = 51204;
const HOST = '127.0.0.1';

function checkRunnerActive() {
  return new Promise((resolve) => {
    const req = http.request({
      host: HOST,
      port: PORT,
      path: '/status',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

function triggerRun() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: HOST,
      port: PORT,
      path: '/run',
      method: 'POST'
    }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Failed to trigger: Status code ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

function getStatus() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: HOST,
      port: PORT,
      path: '/status',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const isActive = await checkRunnerActive();

  if (isActive) {
    console.log(`[SharedTestRunner] Connecting to active Vitest watch runner on port ${PORT}...`);
    try {
      const startTime = Date.now();
      console.log('[SharedTestRunner] Checking for watch runner activity or pending runs...');

      let statusObj = await getStatus();
      let hasSeenRunning = statusObj.status === 'running';
      
      const gracePeriod = 1500; // 1.5 seconds to detect automatic watch run
      const checkInterval = 200;
      let elapsed = 0;

      while (true) {
        statusObj = await getStatus();
        const runTime = statusObj.results ? new Date(statusObj.results.time).getTime() : 0;

        // 1. If we see the runner is currently running, mark it
        if (statusObj.status === 'running') {
          hasSeenRunning = true;
        }

        // 2. If a run completed AFTER our start time, we are done
        if (runTime >= startTime && statusObj.status !== 'running') {
          console.log(`\n[SharedTestRunner] Watch runner completed a new run.`);
          break;
        }

        if (statusObj.status !== 'running' && runTime < startTime) {
          // If we haven't seen it transition to running within the grace period, force a run
          if (!hasSeenRunning && elapsed >= gracePeriod) {
            console.log('\n[SharedTestRunner] No automatic run detected. Triggering a run...');
            await triggerRun();
            hasSeenRunning = true;
          }
        }

        const maxTimeout = 100000; // 100 seconds
        const warnInterval = 15000; // 15 seconds
        const elapsedSinceLastWarn = elapsed % warnInterval;
        if (elapsed > 0 && elapsedSinceLastWarn < checkInterval) {
          console.log(`\n[SharedTestRunner] Still waiting for watch runner (elapsed: ${Math.round(elapsed/1000)}s)...`);
          console.log(`[SharedTestRunner] Status: ${statusObj.status}, Results: ${statusObj.results ? 'available' : 'none'}`);
          console.log(`[SharedTestRunner] Tip: If the runner is hung, run 'npx kill-port 51204' or kill the node process.`);
        }

        if (elapsed >= maxTimeout) {
          console.log(`\n[SharedTestRunner] Watch runner timed out after ${maxTimeout/1000}s.`);
          console.log(`[SharedTestRunner] Falling back to standard vitest run...`);
          runFallback();
          return;
        }

        process.stdout.write('.');
        await new Promise(r => setTimeout(r, checkInterval));
        elapsed += checkInterval;
      }

      console.log(`[SharedTestRunner] Tests finished with status: ${statusObj.status}`);
      if (statusObj.results) {
        const { passed, failed, total } = statusObj.results;
        console.log(`[SharedTestRunner] Summary: ${passed} passed, ${failed} failed, ${total} total`);
        if (statusObj.results.errors && statusObj.results.errors.length > 0) {
          console.error('[SharedTestRunner] Errors encountered:');
          statusObj.results.errors.forEach(err => console.error(`  - ${err}`));
        }
      }

      if (statusObj.status === 'passed') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (err) {
      console.error('[SharedTestRunner] Error communicating with shared runner:', err.message);
      console.log('[SharedTestRunner] Falling back to standard vitest run...');
      runFallback();
    }
  } else {
    console.log('[SharedTestRunner] No active watch runner detected on port 51204. Running vitest directly...');
    runFallback();
  }
}

function runFallback() {
  const child = spawn('npx', ['vitest', 'run'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

run();
