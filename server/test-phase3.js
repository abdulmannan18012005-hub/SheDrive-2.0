const { spawn } = require('child_process');

const server = spawn('npx', ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3001' } });

server.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data}`);
  if (data.toString().includes('Server running')) {
     runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERR] ${data}`);
});

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
    process.exit(1);
});

async function runTests() {
  try {
    console.log('Running Test 1: Health Check...');
    const r1 = await fetch('http://localhost:3001/api/v1/health');
    const j1 = await r1.json();
    if (r1.status !== 200 || j1.db !== 'connected') {
        throw new Error(`Health check failed. Status: ${r1.status}, JSON: ${JSON.stringify(j1)}`);
    }
    console.log('✅ Health check passed');

    console.log('Running Test 2: Protected route without token...');
    const r2 = await fetch('http://localhost:3001/api/v1/protected');
    if (r2.status !== 401) throw new Error(`Expected 401, got ${r2.status}`);
    console.log('✅ 401 test passed');

    console.log('Running Test 3: Protected route with invalid token...');
    const r3 = await fetch('http://localhost:3001/api/v1/protected', {
       headers: { 'Authorization': 'Bearer invalid_token_123' }
    });
    if (r3.status !== 403) throw new Error(`Expected 403, got ${r3.status}`);
    console.log('✅ 403 test passed');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
    
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    server.kill();
    process.exit(0);
  }
}
