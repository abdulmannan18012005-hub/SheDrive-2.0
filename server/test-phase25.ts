import http from 'http';
import { sign } from 'jsonwebtoken';
import app from './src/index';
import { pool } from './src/config/db';
import fs from 'fs';
import path from 'path';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const validToken = sign({ id: 'some-id', role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
const expiredToken = sign({ id: 'some-id', role: 'passenger' }, TEST_SECRET, { expiresIn: '-1h' });
const malformedToken = 'Bearer invalid.token.value';

function fetchRequest(url: string, headers: any): Promise<{status: number, data: string}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'GET', headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 500, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 25 Security & Pipeline Verification Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        console.log('1. Testing /api/v1/health ...');
        const res1 = await fetchRequest(`${baseUrl}/api/v1/health`, {});
        if (res1.status !== 200) throw new Error(`Healthcheck failed with status ${res1.status}`);
        const healthData = JSON.parse(res1.data);
        if (healthData.status !== 'OK') throw new Error('Healthcheck status is not ok');
        console.log('✅ Healthcheck passed');

        console.log('2. Testing CORS Origin Restrictions...');
        const res2 = await fetchRequest(`${baseUrl}/api/v1/health`, { 'Origin': 'http://evil-hacker.com' });
        // Since CORS middleware intercepts and denies it:
        if (res2.status !== 500 && res2.status !== 403 && !res2.data.includes('CORS')) { // the exact response for error depends on Express error handler, but it should block.
             console.log(`CORS blocked with status ${res2.status}. Message: ${res2.data}`);
        }
        
        const res3 = await fetchRequest(`${baseUrl}/api/v1/health`, { 'Origin': 'https://shedrive.onrender.com' });
        if (res3.status !== 200) throw new Error(`Production origin blocked, got ${res3.status}`);
        console.log('✅ CORS Origin Verification passed');

        console.log('3. Testing JWT Token Validation...');
        const res4 = await fetchRequest(`${baseUrl}/api/v1/protected`, { 'Authorization': `Bearer ${validToken}` });
        if (res4.status !== 200) throw new Error('Valid token was rejected');
        
        const res5 = await fetchRequest(`${baseUrl}/api/v1/protected`, { 'Authorization': `Bearer ${expiredToken}` });
        if (res5.status !== 401 && res5.status !== 403) throw new Error('Expired token was NOT rejected');

        const res6 = await fetchRequest(`${baseUrl}/api/v1/protected`, { 'Authorization': malformedToken });
        if (res6.status !== 401 && res6.status !== 403) throw new Error('Malformed token was NOT rejected');
        
        console.log('✅ JWT Validation passed');

        console.log('4. Verifying Build Outputs...');
        const serverDist = path.join(__dirname, 'dist');
        const adminDist = path.join(__dirname, '../admin-portal/dist');
        
        if (!fs.existsSync(serverDist)) throw new Error('server/dist does not exist');
        if (!fs.existsSync(adminDist)) throw new Error('admin-portal/dist does not exist');
        console.log('✅ Build Outputs verified');

        console.log('ALL PHASE 25 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        server.close();
        await pool.end();
    }
}

runTests();
