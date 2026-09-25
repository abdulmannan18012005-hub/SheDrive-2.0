const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3010' } });

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

const testPassengerId = 'p12-7777-7777-7777-777777777777';
const testDriver1Id = 'd12-1111-1111-1111-111111111111';
const testDriver2Id = 'd12-2222-2222-2222-222222222222';
const rideId = 'ride-test-phase12-bids';
const passengerToken = jwt.sign({ id: testPassengerId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    const now = Date.now();
    // 1. Setup mock data
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%test-phase12%`]);
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id IN ($1, $2)", [testDriver1Id, testDriver2Id]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [testPassengerId, testDriver1Id, testDriver2Id]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'pass12@test.com', 'h', 'Pass 12', '12', '1212', 'passenger', true, false, $2, $2)", [testPassengerId, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'drv12_1@test.com', 'h', 'Driver 1', '121', '1213', 'driver', true, false, $2, $2)", [testDriver1Id, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'drv12_2@test.com', 'h', 'Driver 2', '122', '1214', 'driver', true, false, $2, $2)", [testDriver2Id, now]);

    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, last_location_update, rating, total_rides) VALUES ($1, 'Toyota', 'Corolla', 'White', 'ABC-123', 'car_ac', $2, 4.8, 100)", [testDriver1Id, now]);
    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, last_location_update, rating, total_rides) VALUES ($1, 'Honda', 'City', 'Black', 'XYZ-987', 'mini', $2, 4.9, 150)", [testDriver2Id, now]);

    // Insert ride
    await client.query(`
        INSERT INTO rides (ride_id, passenger_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, created_at, updated_at)
        VALUES ($1, $2, 'searching', 'car_ac', 31.5, 74.3, 'A', 31.6, 74.4, 'B', 10, 20, 500, 450, $3, $3)
    `, [rideId, testPassengerId, now]);

    // Insert 2 bids: 1 active (10s TTL), 1 expired
    const bid1Id = 'bid1-active';
    const bid2Id = 'bid2-expired';
    await client.query(`
        INSERT INTO bids (id, ride_id, driver_id, offered_fare, status, created_at, expires_at)
        VALUES ($1, $2, $3, 400, 'pending', $4, $5)
    `, [bid1Id, rideId, testDriver1Id, now, now + 10000]); // active

    await client.query(`
        INSERT INTO bids (id, ride_id, driver_id, offered_fare, status, created_at, expires_at)
        VALUES ($1, $2, $3, 350, 'pending', $4, $5)
    `, [bid2Id, rideId, testDriver2Id, now - 20000, now - 10000]); // expired

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${passengerToken}` };
    console.log('Running Phase 12 Bidding tests...');
    
    // 2. Fetch Bids
    const rBids = await fetch(`http://localhost:3010/api/v1/rides/${rideId}/bids`, { method: 'GET', headers });
    if (rBids.status !== 200) throw new Error(`Expected 200 for fetch bids, got ${rBids.status}`);
    const jBids = await rBids.json();
    
    if (jBids.bids.length !== 1 || jBids.bids[0].bid_id !== bid1Id) {
        throw new Error('Bid fetch did not correctly filter expired bids or missing driver joins');
    }
    if (!jBids.bids[0].driver_name || !jBids.bids[0].vehicle.make) {
        throw new Error('Bid fetch missing sanitized driver/vehicle details');
    }
    console.log('✅ Bid retrieval with driver sanitization and TTL filtering successful');

    // 3. Decline bid (Mock isolated decline) - We will decline bid1, wait no, we need to accept bid1. 
    // Let's create a 3rd bid to decline.
    const bid3Id = 'bid3-decline';
    await client.query(`
        INSERT INTO bids (id, ride_id, driver_id, offered_fare, status, created_at, expires_at)
        VALUES ($1, $2, $3, 480, 'pending', $4, $5)
    `, [bid3Id, rideId, testDriver2Id, now, now + 10000]);

    const rDecline = await fetch(`http://localhost:3010/api/v1/rides/${rideId}/bids/${bid3Id}/decline`, { method: 'POST', headers });
    if (rDecline.status !== 200) throw new Error(`Expected 200 for decline, got ${rDecline.status}`);
    const dbDecline = await client.query('SELECT status FROM bids WHERE id = $1', [bid3Id]);
    if (dbDecline.rows[0].status !== 'declined') throw new Error('Bid 3 was not declined');
    
    const dbRideBefore = await client.query('SELECT status FROM rides WHERE ride_id = $1', [rideId]);
    if (dbRideBefore.rows[0].status !== 'searching') throw new Error('Ride status changed inappropriately after single decline');
    console.log('✅ Isolated bid decline successful, ride remains searching');

    // 4. Accept Bid 1
    const rAccept = await fetch(`http://localhost:3010/api/v1/rides/${rideId}/bids/${bid1Id}/accept`, { method: 'POST', headers });
    if (rAccept.status !== 200) throw new Error(`Expected 200 for accept, got ${rAccept.status}`);
    
    const dbRide = await client.query('SELECT status, driver_id, final_fare FROM rides WHERE ride_id = $1', [rideId]);
    if (dbRide.rows[0].status !== 'accepted' || dbRide.rows[0].driver_id !== testDriver1Id || Number(dbRide.rows[0].final_fare) !== 400) {
        throw new Error('Ride was not properly updated on bid accept');
    }

    const dbBid1 = await client.query('SELECT status FROM bids WHERE id = $1', [bid1Id]);
    if (dbBid1.rows[0].status !== 'accepted') throw new Error('Winning bid status not updated');

    console.log('✅ Atomic PostgreSQL acceptance transaction successful (Ride accepted, driver assigned)');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id IN ($1, $2)", [testDriver1Id, testDriver2Id]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [testPassengerId, testDriver1Id, testDriver2Id]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 5000);
