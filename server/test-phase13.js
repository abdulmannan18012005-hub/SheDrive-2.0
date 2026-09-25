const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3011' } });

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

const testPassengerId = 'p13-7777-7777-7777-777777777777';
const testDriverId = 'd13-1111-1111-1111-111111111111';
const rideId = 'ride-test-phase13';
const driverToken = jwt.sign({ id: testDriverId, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    const now = Date.now();
    // 1. Setup mock data
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%test-phase13%`]);
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [testPassengerId, testDriverId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'pass13@test.com', 'h', 'Pass 13', '13', '1313', 'passenger', true, false, $2, $2)", [testPassengerId, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'drv13@test.com', 'h', 'Driver 13', '131', '1314', 'driver', true, false, $2, $2)", [testDriverId, now]);

    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, last_location_update, rating, total_rides) VALUES ($1, 'Toyota', 'Corolla', 'White', 'ABC-123', 'car_ac', $2, 4.8, 100)", [testDriverId, now]);

    // Insert ride
    await client.query(`
        INSERT INTO rides (ride_id, passenger_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, created_at, updated_at)
        VALUES ($1, $2, 'searching', 'car_ac', 31.5, 74.3, 'A', 31.6, 74.4, 'B', 10, 20, 500, 400, $3, $3)
    `, [rideId, testPassengerId, now]);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` };
    console.log('Running Phase 13 Driver Bidding tests...');
    
    // 2. Fetch Available Rides
    const rFeed = await fetch(`http://localhost:3011/api/v1/rides/available`, { method: 'GET', headers });
    if (rFeed.status !== 200) throw new Error(`Expected 200 for fetch available rides, got ${rFeed.status}`);
    const jFeed = await rFeed.json();
    
    const feedRide = jFeed.rides.find((r) => r.ride_id === rideId);
    if (!feedRide) {
        throw new Error('Test ride did not appear in driver feed');
    }
    if (!feedRide.passenger_name || Number(feedRide.offered_fare) !== 400) {
        throw new Error('Feed missing joined passenger details or fare');
    }
    console.log('✅ Driver feed accurately queried by vehicle category with passenger metadata');

    // 3. Submit first counter offer
    const rBid1 = await fetch(`http://localhost:3011/api/v1/rides/${rideId}/bids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ offered_fare: 480 })
    });
    if (rBid1.status !== 201) throw new Error(`Expected 201 for bid 1, got ${rBid1.status}`);
    const jBid1 = await rBid1.json();
    const bidId = jBid1.bid.id;
    if (Number(jBid1.bid.offered_fare) !== 480 || jBid1.bid.status !== 'pending') {
        throw new Error('Bid 1 state is incorrect');
    }
    console.log('✅ First counter-offer submitted successfully');

    // 4. Submit SECOND counter offer (should fail)
    const rBid2 = await fetch(`http://localhost:3011/api/v1/rides/${rideId}/bids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ offered_fare: 500 })
    });
    if (rBid2.status !== 400) {
        throw new Error(`Strict 1-counter limit failed! Expected 400, got ${rBid2.status}`);
    }
    console.log('✅ Strict 1-counter limit properly enforced');

    // 5. Withdraw bid
    const rWithdraw = await fetch(`http://localhost:3011/api/v1/rides/${rideId}/bids/${bidId}/withdraw`, { method: 'POST', headers });
    if (rWithdraw.status !== 200) throw new Error(`Expected 200 for withdraw, got ${rWithdraw.status}`);

    const dbBid = await client.query('SELECT status FROM bids WHERE id = $1', [bidId]);
    if (dbBid.rows[0].status !== 'declined') throw new Error('Bid was not withdrawn/declined properly');

    console.log('✅ Driver bid withdrawal functioning correctly');

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

// Give server time to start
setTimeout(runTests, 5000);
