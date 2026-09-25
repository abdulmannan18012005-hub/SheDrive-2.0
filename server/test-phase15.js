const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3015' } });

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

const testPassengerId = 'p15-7777-7777-7777-777777777777';
const testDriverId = 'd15-1111-1111-1111-111111111111';
const rideId = 'ride-test-phase15';
const passengerToken = jwt.sign({ id: testPassengerId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });
const driverToken = jwt.sign({ id: testDriverId, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    const now = Date.now();
    // Setup mock data
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%test-phase15%`]);
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [testPassengerId, testDriverId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, first_name, phone, cnic, role, is_verified, created_at, updated_at) VALUES ($1, 'pass15@test.com', 'h', 'Pass 15', 'Pass', '+923000000015', '1515', 'passenger', true, $2, $2)", [testPassengerId, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, first_name, phone, cnic, role, is_verified, created_at, updated_at) VALUES ($1, 'drv15@test.com', 'h', 'Driver 15', 'Driver', '+923000000016', '1516', 'driver', true, $2, $2)", [testDriverId, now]);

    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, rating, total_rides, last_location_update) VALUES ($1, 'Suzuki', 'Alto', 'White', 'ABC-1515', 'mini', 4.5, 150, $2)", [testDriverId, now]);

    // Insert ride as 'accepted'
    await client.query(`
        INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at)
        VALUES ($1, $2, $3, 'accepted', 'mini', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 10, 20, 500, 450, 450, $4, $4)
    `, [rideId, testPassengerId, testDriverId, now]);

    console.log('Running Phase 15 State Machine tests...');
    
    // 1. Unmasked Phone Check (Passenger -> active)
    const rActive = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/active`, { 
        headers: { 'Authorization': `Bearer ${passengerToken}` }
    });
    const jActive = await rActive.json();
    if (rActive.status !== 200 || !jActive.active_ride || jActive.active_ride.driver.phone !== '+923000000016') {
        throw new Error('Phone unmasking failed or unauthorized for accepted ride');
    }
    console.log('✅ Active ride unmasked driver phone properly');

    // 2. Transition accepted -> arrived
    const rArrived = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'arrived' })
    });
    if (rArrived.status !== 200) throw new Error(`Expected 200, got ${rArrived.status}`);
    const arrivedDb = await client.query('SELECT arrived_at, status FROM rides WHERE ride_id = $1', [rideId]);
    if (arrivedDb.rows[0].status !== 'arrived' || !arrivedDb.rows[0].arrived_at) throw new Error('Arrived state/timestamp failed');
    console.log('✅ Status transitioned: accepted -> arrived');

    // 3. Illegal Jump arrived -> completed
    const rJump = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'completed' })
    });
    if (rJump.status !== 400) throw new Error(`Expected 400 Bad Request for illegal jump, got ${rJump.status}`);
    console.log('✅ Illegal state transition safely rejected');

    // 4. Transition arrived -> in_progress
    const rStart = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'in_progress' })
    });
    if (rStart.status !== 200) throw new Error(`Expected 200, got ${rStart.status}`);
    const startDb = await client.query('SELECT started_at, status FROM rides WHERE ride_id = $1', [rideId]);
    if (startDb.rows[0].status !== 'in_progress' || !startDb.rows[0].started_at) throw new Error('In-progress state/timestamp failed');
    console.log('✅ Status transitioned: arrived -> in_progress');

    // 5. Transition in_progress -> completed
    const rEnd = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'completed' })
    });
    if (rEnd.status !== 200) throw new Error(`Expected 200, got ${rEnd.status}`);
    const endDb = await client.query('SELECT completed_at, status FROM rides WHERE ride_id = $1', [rideId]);
    if (endDb.rows[0].status !== 'completed' || !endDb.rows[0].completed_at) throw new Error('Completed state/timestamp failed');
    console.log('✅ Status transitioned: in_progress -> completed');

    // 6. Terminal state immutability
    const rTerminal = await fetch(`http://localhost:3015/api/v1/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'cancelled' })
    });
    if (rTerminal.status !== 400) throw new Error(`Terminal state failed! Expected 400, got ${rTerminal.status}`);
    console.log('✅ Terminal state safely rejected further mutations');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [testPassengerId, testDriverId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

setTimeout(runTests, 5000);
