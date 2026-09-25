const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3008' } });

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

const testDriverId = '88888888-8888-8888-8888-888888888888';
const driverToken = jwt.sign({ id: testDriverId, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    // 1. Setup mock driver in DB
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%${testDriverId}%`]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id = $1", [testDriverId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'driver10@example.com', 'hash', 'Test Driver 10', '121212', 'driver', '222', true, false, 1700000000000, 1700000000000)", [testDriverId]);
    
    // Make them online and available
    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, vehicle_category, vehicle_review_status, last_location_update, is_online, is_available) VALUES ($1, 'Honda', 'Civic', 2021, 'Black', 'XYZ-999', 'car_ac', 'approved', 1700000000000, true, true)", [testDriverId]);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` };

    console.log('Running Phase 10 Telemetry tests...');
    
    // 2. Dispatch location payload
    const rPost = await fetch('http://localhost:3008/api/v1/telemetry/location', { 
        method: 'POST', 
        headers,
        body: JSON.stringify({ latitude: 31.5204, longitude: 74.3587, heading: 45, speed: 20 })
    });
    if (rPost.status !== 200) throw new Error(`Expected 200 for location post, got ${rPost.status}`);
    
    // Verify DB update
    const dbDriver = await client.query('SELECT latitude, longitude, heading, speed FROM drivers WHERE driver_id = $1', [testDriverId]);
    if (dbDriver.rows[0].latitude !== 31.5204 || dbDriver.rows[0].speed !== 20) {
        throw new Error('Database was not updated correctly with telemetry data');
    }
    console.log('✅ Telemetry POST and database persistence successful');

    // 3. Query nearby drivers (same coordinates)
    const passengerToken = jwt.sign({ id: '99999999-9999-9999-9999-999999999999', role: 'passenger' }, process.env.JWT_SECRET || 'fallback', { expiresIn: '1h' });
    const pHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${passengerToken}` };

    const rNearby = await fetch('http://localhost:3008/api/v1/telemetry/nearby-drivers?lat=31.5204&lng=74.3587&radius_km=5', { method: 'GET', headers: pHeaders });
    if (rNearby.status !== 200) throw new Error(`Expected 200 for nearby drivers, got ${rNearby.status}`);
    const jNearby = await rNearby.json();
    
    const foundDriver = jNearby.drivers.find(d => d.driver_id === testDriverId);
    if (!foundDriver) throw new Error('Test driver was not found in nearby drivers');
    console.log('✅ Driver appears in nearby radius');

    // 4. Query distant coordinates (e.g. Islamabad ~370km away)
    const rDistant = await fetch('http://localhost:3008/api/v1/telemetry/nearby-drivers?lat=33.6844&lng=73.0479&radius_km=5', { method: 'GET', headers: pHeaders });
    const jDistant = await rDistant.json();
    const foundDistant = jDistant.drivers.find(d => d.driver_id === testDriverId);
    if (foundDistant) throw new Error('Test driver should NOT be found in distant query');
    console.log('✅ Driver correctly excluded from distant query');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id = $1", [testDriverId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 5000);
