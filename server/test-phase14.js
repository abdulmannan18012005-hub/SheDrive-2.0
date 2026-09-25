const { spawn } = require('child_process');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3014' } });

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

const testPassengerId = 'p14-7777-7777-7777-777777777777';
const testDriverId = 'd14-1111-1111-1111-111111111111';
const rideId = 'ride-test-phase14';
const passengerToken = jwt.sign({ id: testPassengerId, role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });
const driverToken = jwt.sign({ id: testDriverId, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });
const roguePassengerToken = jwt.sign({ id: 'p14-rogue-rogue-rogue-rogueroguerogue', role: 'passenger' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  try {
    const now = Date.now();
    // 1. Setup mock data
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%test-phase14%`]);
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [testPassengerId, testDriverId, 'p14-rogue-rogue-rogue-rogueroguerogue']);
    
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'pass14@test.com', 'h', 'Pass 14', '140', '1414', 'passenger', true, false, $2, $2)", [testPassengerId, now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'rogue14@test.com', 'h', 'Rogue 14', '149', '1415', 'passenger', true, false, $2, $2)", ['p14-rogue-rogue-rogue-rogueroguerogue', now]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, cnic, role, is_verified, is_blocked, created_at, updated_at) VALUES ($1, 'drv14@test.com', 'h', 'Driver 14', '141', '1416', 'driver', true, false, $2, $2)", [testDriverId, now]);

    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, vehicle_category, last_location_update, rating, total_rides) VALUES ($1, 'Honda', 'Civic', 'Silver', 'XYZ-1414', 'car_ac', $2, 4.9, 200)", [testDriverId, now]);

    // Insert ride
    await client.query(`
        INSERT INTO rides (ride_id, passenger_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, created_at, updated_at)
        VALUES ($1, $2, 'searching', 'car_ac', 31.5, 74.3, 'A', 31.6, 74.4, 'B', 10, 20, 500, 400, $3, $3)
    `, [rideId, testPassengerId, now]);

    // Insert bid
    await client.query(`
        INSERT INTO bids (id, ride_id, driver_id, offered_fare, status, created_at, expires_at)
        VALUES ('bid-14', $1, $2, 450, 'pending', $3, $4)
    `, [rideId, testDriverId, now, now + 10000]);

    console.log('Running Phase 14 Profile Inspection tests...');
    
    // 2. Fetch Driver Profile as Passenger
    const rDriver = await fetch(`http://localhost:3014/api/v1/rides/${rideId}/driver-profile/${testDriverId}`, { 
        method: 'GET', headers: { 'Authorization': `Bearer ${passengerToken}` }
    });
    if (rDriver.status !== 200) throw new Error(`Expected 200 for fetch driver profile, got ${rDriver.status}`);
    const jDriver = await rDriver.json();
    
    if (!jDriver.vehicle || !jDriver.vehicle.make || jDriver.rating !== 4.9) {
        throw new Error('Driver profile missing valid vehicle or rating payload');
    }
    if (jDriver.phone !== undefined || jDriver.email !== undefined || jDriver.cnic !== undefined || jDriver.license_number !== undefined) {
        throw new Error('Driver profile FAILED STRICT MASKING. Sensitive fields exposed!');
    }
    console.log('✅ Passenger fetch driver profile successful. Strict masking validated (0 leaks).');

    // 3. Fetch Passenger Profile as Driver
    const rPassenger = await fetch(`http://localhost:3014/api/v1/rides/${rideId}/passenger-profile`, { 
        method: 'GET', headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    if (rPassenger.status !== 200) throw new Error(`Expected 200 for fetch passenger profile, got ${rPassenger.status}`);
    const jPassenger = await rPassenger.json();
    
    if (!jPassenger.first_name || jPassenger.is_phone_verified === undefined) {
        throw new Error('Passenger profile missing valid data');
    }
    if (jPassenger.phone !== undefined || jPassenger.email !== undefined || jPassenger.cnic !== undefined) {
        throw new Error('Passenger profile FAILED STRICT MASKING. Sensitive fields exposed!');
    }
    console.log('✅ Driver fetch passenger profile successful. Strict masking validated (0 leaks).');

    // 4. Unauthorized fetch attempt
    const rRogue = await fetch(`http://localhost:3014/api/v1/rides/${rideId}/driver-profile/${testDriverId}`, { 
        method: 'GET', headers: { 'Authorization': `Bearer ${roguePassengerToken}` }
    });
    if (rRogue.status !== 403) throw new Error(`Expected 403 Forbidden for rogue passenger, got ${rRogue.status}`);
    console.log('✅ Unauthorized access cleanly blocked with 403 Forbidden.');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM bids WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [testPassengerId, testDriverId, 'p14-rogue-rogue-rogue-rogueroguerogue']);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 5000);
