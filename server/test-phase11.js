const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3009' } });

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

const testPassengerId = '77777777-7777-7777-7777-777777777777';
const passengerToken = jwt.sign({ id: testPassengerId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    // 1. Setup mock passenger in DB
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%${testPassengerId}%`]);
    await client.query("DELETE FROM rides WHERE passenger_id = $1", [testPassengerId]);
    await client.query("DELETE FROM users WHERE id = $1", [testPassengerId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'pass11@example.com', 'hash', 'Test Passenger 11', '323232', 'passenger', '333', true, false, 1700000000000, 1700000000000)", [testPassengerId]);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${passengerToken}` };

    console.log('Running Phase 11 Ride Request tests...');
    
    // 2. Query /api/v1/rides/estimate
    const rEst = await fetch('http://localhost:3009/api/v1/rides/estimate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            pickup: { lat: 31.5085, lng: 74.3487, address: 'Liberty Market' },
            dropoff: { lat: 31.5540, lng: 74.3587, address: 'Mall of Lahore' }
        })
    });
    if (rEst.status !== 200) throw new Error(`Expected 200 for estimate, got ${rEst.status}`);
    const jEst = await rEst.json();
    if (!jEst.distance_km || !jEst.duration_mins || !jEst.estimates.car_ac) {
        throw new Error('Estimate response missing key fields');
    }
    console.log('✅ Ride estimation returns sensible fare and distance calculations');

    // 3. Dispatch /api/v1/rides/request
    const rReq = await fetch('http://localhost:3009/api/v1/rides/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            category: 'car_ac',
            offered_fare: jEst.estimates.car_ac,
            pickup: { lat: 31.5085, lng: 74.3487, address: 'Liberty Market' },
            dropoff: { lat: 31.5540, lng: 74.3587, address: 'Mall of Lahore' }
        })
    });
    if (rReq.status !== 201) throw new Error(`Expected 201 for ride request, got ${rReq.status}`);
    const jReq = await rReq.json();
    const rideId = jReq.ride.ride_id;
    if (!rideId || jReq.ride.status !== 'searching') {
        throw new Error('Ride request failed or status is not searching');
    }
    console.log('✅ Ride request creation successful (status: searching)');

    // 4. Fetch /api/v1/rides/:id
    const rGet = await fetch(`http://localhost:3009/api/v1/rides/${rideId}`, { method: 'GET', headers });
    if (rGet.status !== 200) throw new Error(`Expected 200 for GET ride, got ${rGet.status}`);
    const jGet = await rGet.json();
    if (jGet.ride.ride_id !== rideId) throw new Error('Fetched ride does not match requested ride ID');
    console.log('✅ Ride fetching successfully maintains data integrity');

    // 5. Execute /api/v1/rides/:id/cancel
    const rCancel = await fetch(`http://localhost:3009/api/v1/rides/${rideId}/cancel`, { method: 'POST', headers });
    if (rCancel.status !== 200) throw new Error(`Expected 200 for cancel, got ${rCancel.status}`);
    
    const dbRide = await client.query('SELECT status FROM rides WHERE ride_id = $1', [rideId]);
    if (dbRide.rows[0].status !== 'cancelled') throw new Error('Database ride status was not updated to cancelled');
    console.log('✅ Ride cancellation successfully transitions to cancelled');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM rides WHERE passenger_id = $1", [testPassengerId]);
    await client.query("DELETE FROM users WHERE id = $1", [testPassengerId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 5000);
