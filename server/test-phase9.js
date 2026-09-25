const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3007' } });

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERR] ${data}`);
});
server.stdout.on('data', (data) => {
  console.log(`[SERVER OUT] ${data}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

const jwt = require('jsonwebtoken');

const testUserId = '99999999-9999-9999-9999-999999999999';
const userToken = jwt.sign({ id: testUserId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

function searchForApiKeys(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchForApiKeys(fullPath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('AIzaSy') || content.includes('GOOGLE_MAPS_API_KEY')) {
                // Ensure it's not a comment or something, but strict check:
                throw new Error(`Google Maps API Key or reference found in mobile workspace: ${fullPath}`);
            }
        }
    }
}

async function runTests() {
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` };

    console.log('Running Phase 9 Places Proxy tests...');
    
    // 1. Autocomplete Endpoint Test (Mock)
    const rAutocomplete = await fetch('http://localhost:3007/api/v1/places/autocomplete?query=Gulberg', { method: 'GET', headers });
    if (rAutocomplete.status !== 200) throw new Error(`Expected 200 for autocomplete, got ${rAutocomplete.status}`);
    const jAutocomplete = await rAutocomplete.json();
    if (!jAutocomplete.predictions || !Array.isArray(jAutocomplete.predictions)) throw new Error('Invalid predictions structure');
    if (!jAutocomplete.predictions[0].place_id || !jAutocomplete.predictions[0].main_text) throw new Error('Prediction missing fields');
    console.log('✅ Autocomplete endpoint returns valid structured response');

    // 2. Details Endpoint Test (Mock)
    const mockPlaceId = jAutocomplete.predictions[0].place_id;
    const rDetails = await fetch(`http://localhost:3007/api/v1/places/details/${mockPlaceId}`, { method: 'GET', headers });
    if (rDetails.status !== 200) throw new Error(`Expected 200 for details, got ${rDetails.status}`);
    const jDetails = await rDetails.json();
    if (!jDetails.place || typeof jDetails.place.latitude !== 'number' || typeof jDetails.place.longitude !== 'number') {
        throw new Error('Place details missing valid latitude/longitude coordinates');
    }
    console.log('✅ Place Details endpoint returns valid coordinates');

    // 3. Scan mobile workspace for API Keys
    const mobileDir = path.join(__dirname, '../mobile');
    searchForApiKeys(mobileDir);
    console.log('✅ Mobile workspace is free of direct Google Maps API keys');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 5000);
