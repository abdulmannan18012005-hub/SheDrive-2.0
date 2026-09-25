const { spawn } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3005' } });

server.stdout.on('data', (data) => {
  if (data.toString().includes('Server running')) {
     runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERR] ${data}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

const jwt = require('jsonwebtoken');
const testUserId = '88888888-8888-8888-8888-888888888888';
const token = jwt.sign({ id: testUserId, role: 'driver' }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });

async function runTests() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Create base tables
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(50),
            role VARCHAR(50) NOT NULL,
            cnic VARCHAR(50) NOT NULL,
            created_at BIGINT,
            updated_at BIGINT
        );
    `);

    // Clean up
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [testUserId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, created_at, updated_at) VALUES ($1, 'driverp7@example.com', 'hash', 'Test Driver', '1234567890', 'driver', '1234567890123', 1700000000000, 1700000000000)", [testUserId]);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    console.log('Running Driver/Vehicle/Document Flow tests...');
    
    // 1. Invalid Category Setup
    const rInvalid = await fetch('http://localhost:3005/api/v1/driver/vehicle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ make: 'Honda', model: 'Civic', year: 2020, color: 'Black', plate_number: 'ABC-123', category: 'rickshaw' })
    });
    if (rInvalid.status !== 400) throw new Error(`Expected 400 for invalid category, got ${rInvalid.status}`);
    console.log('✅ Invalid category rejection passed');

    // 2. Valid Setup
    const rSetup = await fetch('http://localhost:3005/api/v1/driver/vehicle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ make: 'Suzuki', model: 'Alto', year: 2022, color: 'White', plate_number: 'XYZ-987', category: 'mini' })
    });
    if (rSetup.status !== 201) throw new Error(`Expected 201 for valid setup, got ${rSetup.status}`);
    console.log('✅ Valid vehicle setup passed');

    // 3. Document Upload (Base64 simulate)
    const rUpload = await fetch('http://localhost:3005/api/v1/driver/documents/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cnic_front: 'data:image/jpeg;base64,aGVsbG8=', license: 'data:image/jpeg;base64,aGVsbG8=' })
    });
    if (rUpload.status !== 200) throw new Error(`Expected 200 for doc upload, got ${rUpload.status}`);
    console.log('✅ Document upload passed');

    // 4. Status Check
    const rStatus = await fetch('http://localhost:3005/api/v1/driver/status', { method: 'GET', headers });
    const jStatus = await rStatus.json();
    if (jStatus.driver.status !== 'pending') throw new Error('Driver status is not pending');
    if (!jStatus.driver.cnic_uploaded) throw new Error('CNIC upload flag not true');
    console.log('✅ Status check passed');

    // 5. Update Vehicle (triggers pending)
    const rUpdate = await fetch('http://localhost:3005/api/v1/driver/vehicle', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ color: 'Silver' })
    });
    if (rUpdate.status !== 200) throw new Error(`Expected 200 for update, got ${rUpdate.status}`);
    
    const rStatus2 = await fetch('http://localhost:3005/api/v1/driver/status', { method: 'GET', headers });
    const jStatus2 = await rStatus2.json();
    if (jStatus2.driver.status !== 'pending') throw new Error(`Status not updated to pending, got ${jStatus2.driver.status}`);
    if (jStatus2.driver.color !== 'Silver') throw new Error('Vehicle color not updated');
    console.log('✅ Vehicle update & review trigger passed');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [testUserId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}
