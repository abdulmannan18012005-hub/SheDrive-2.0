const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3016' } });

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

const testPassengerId = 'p16-7777-7777-7777-777777777777';
const testDriverId = 'd16-1111-1111-1111-111111111111';
const rideId = 'ride-test-phase16';
const passengerToken = jwt.sign({ id: testPassengerId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    const now = Date.now();
    
    // Setup mock data
    await client.query(`
        CREATE TABLE IF NOT EXISTS ride_shares (
            id VARCHAR(64) PRIMARY KEY,
            ride_id VARCHAR(64) NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
            share_token VARCHAR(128) UNIQUE NOT NULL,
            created_by VARCHAR(64) NOT NULL REFERENCES users(id),
            is_active BOOLEAN DEFAULT true,
            expires_at BIGINT NOT NULL,
            created_at BIGINT NOT NULL
        );
    `);
    await client.query("DELETE FROM ride_shares WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%test-phase16%`]);
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [testPassengerId, testDriverId]);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, first_name, phone, cnic, role, is_verified, created_at, updated_at) VALUES ($1, 'pass16@test.com', 'h', 'Pass 16', 'Pass', '+923000000016', '1616', 'passenger', true, $2, $2)", [testPassengerId, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, first_name, phone, cnic, role, is_verified, created_at, updated_at) VALUES ($1, 'drv16@test.com', 'h', 'Driver 16', 'Driver', '+923000000017', '1617', 'driver', true, $2, $2)", [testDriverId, now]);

    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, rating, total_rides, last_location_update) VALUES ($1, 'Suzuki', 'Cultus', 'Black', 'DEF-1616', 'mini', 4.9, 160, $2)", [testDriverId, now]);

    // Insert ride as 'in_progress'
    await client.query(`
        INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at)
        VALUES ($1, $2, $3, 'in_progress', 'mini', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 10, 20, 500, 450, 450, $4, $4)
    `, [rideId, testPassengerId, testDriverId, now]);

    console.log('Running Phase 16 Live Ride Share tracking tests...');
    
    // 1. Generate Share Token
    const rShare = await fetch(`http://localhost:3016/api/v1/rides/${rideId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${passengerToken}` }
    });
    const jShare = await rShare.json();
    if (rShare.status !== 201 || !jShare.share_token) {
        throw new Error('Failed to generate share token');
    }
    const shareToken = jShare.share_token;
    if (shareToken.length !== 64) {
        throw new Error(`Token length is incorrect, got ${shareToken.length}, expected 64`);
    }
    console.log('✅ Share token generated successfully');

    // 2. Query Public Track Endpoint
    const rTrack = await fetch(`http://localhost:3016/api/v1/rides/public-track/${shareToken}`);
    const jTrack = await rTrack.json();
    if (rTrack.status !== 200) {
        throw new Error(`Public tracking endpoint failed with status ${rTrack.status}`);
    }
    
    // Assert Strict Privacy Filters
    const forbiddenKeys = ['phone', 'email', 'cnic', 'password', 'fare'];
    for (const key of forbiddenKeys) {
        if (JSON.stringify(jTrack).toLowerCase().includes(`"${key}"`)) {
            throw new Error(`Strict privacy violation: Found "${key}" in public track payload!`);
        }
    }
    if (!jTrack.pickup || !jTrack.vehicle || !jTrack.driver_live_location) {
        throw new Error('Missing tracking essential data');
    }
    console.log('✅ Public tracking payload fetched successfully with zero sensitive data leaks');

    // 3. Test Revocation
    const rRevoke = await fetch(`http://localhost:3016/api/v1/rides/${rideId}/share`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${passengerToken}` }
    });
    if (rRevoke.status !== 200) throw new Error('Failed to revoke share link');
    
    const rTrackRevoked = await fetch(`http://localhost:3016/api/v1/rides/public-track/${shareToken}`);
    if (rTrackRevoked.status !== 404) {
        throw new Error(`Expected 404 for revoked tracking link, got ${rTrackRevoked.status}`);
    }
    console.log('✅ Share token revoked successfully; tracking link properly disabled');

    // 4. Rate Limiting Test
    console.log('Testing rate limits (sending 35 requests fast)...');
    let limitHit = false;
    for (let i = 0; i < 35; i++) {
        const rLimit = await fetch(`http://localhost:3016/api/v1/rides/public-track/randomToken123`);
        if (rLimit.status === 429) {
            limitHit = true;
            break;
        }
    }
    if (!limitHit) {
        throw new Error('Rate limiting failed! Brute force enumeration is possible.');
    }
    console.log('✅ Rate limiting properly enforced (429 Too Many Requests)');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM ride_shares WHERE ride_id = $1", [rideId]);
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
