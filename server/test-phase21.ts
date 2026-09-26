import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `p21-${Date.now()}`;
const driverId = `d21-${Date.now()}`;
const otherPassId = `p21-other-${Date.now()}`;

const pToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
const otherToken = sign({ id: otherPassId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });

const r1 = `r21-1-${Date.now()}`;
const r2 = `r21-2-${Date.now()}`;
const r3 = `r21-3-${Date.now()}`;

async function setupTestData() {
    const now = Date.now();
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Pass21', $2, $3, 'passenger', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [passengerId, `03${now.toString().slice(-9)}`, `p1${now}@test.com`, `12345-${now.toString().slice(-7)}-1`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Drv21', $2, $3, 'driver', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [driverId, `04${now.toString().slice(-9)}`, `d1${now}@test.com`, `12345-${now.toString().slice(-7)}-2`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'OtherPass21', $2, $3, 'passenger', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [otherPassId, `05${now.toString().slice(-9)}`, `p2${now}@test.com`, `12345-${now.toString().slice(-7)}-3`, now]);
    
    await pool.query("INSERT INTO drivers (driver_id, is_online, rating, total_rides, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, last_location_update) VALUES ($1, true, 4.5, 10, 'Honda', 'Civic', 'LHR-21', 'Black', $2) ON CONFLICT DO NOTHING", [driverId, now]);

    // Rides (Gulberg, DHA, Model Town)
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'mini', 31.5, 74.3, 'Gulberg', 31.6, 74.4, 'Airport', 10.0, 20, 500, 500, 500, $4, $4) ON CONFLICT DO NOTHING", [r1, passengerId, driverId, now - 100000]);
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'mini', 31.5, 74.3, 'DHA Phase 5', 31.6, 74.4, 'Packages Mall', 12.0, 25, 600, 600, 600, $4, $4) ON CONFLICT DO NOTHING", [r2, passengerId, driverId, now - 50000]);
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'mini', 31.5, 74.3, 'Model Town', 31.6, 74.4, 'WAPDA Town', 8.0, 15, 400, 400, 400, $4, $4) ON CONFLICT DO NOTHING", [r3, passengerId, driverId, now]);

    // Add a payment transaction for r1
    await pool.query("INSERT INTO payment_transactions (id, ride_id, user_id, provider, payer_id, payee_id, amount, payment_method, status, created_at, updated_at) VALUES ($1, $2, $3, 'cash', $4, $5, 500, 'cash', 'success', $6, $6)", [`tx-${now}`, r1, driverId, passengerId, driverId, now]);

    // Add a rating for r1
    await pool.query("INSERT INTO ratings (id, ride_id, rater_id, rated_id, rater_role, rating, tags, created_at) VALUES ($1, $2, $3, $4, 'passenger', 5, '{\"Safe Driving\"}', $5)", [`rat-${now}`, r1, passengerId, driverId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM ratings WHERE ride_id IN ($1, $2, $3)", [r1, r2, r3]);
    await pool.query("DELETE FROM payment_transactions WHERE ride_id IN ($1, $2, $3)", [r1, r2, r3]);
    await pool.query("DELETE FROM rides WHERE ride_id IN ($1, $2, $3)", [r1, r2, r3]);
    await pool.query("DELETE FROM drivers WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [passengerId, driverId, otherPassId]);
    await pool.end();
}

function fetchJSON(url: string, headers: any): Promise<{status: number, data: any}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'GET', headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode || 500, data: data ? JSON.parse(data) : null });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 21 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Default History Query...');
        const h1 = await fetchJSON(`${baseUrl}/api/v1/rides/history`, { 'Authorization': `Bearer ${pToken}` });
        if (h1.status !== 200) throw new Error(`Expected 200, got ${h1.status}`);
        if (h1.data.rides.length < 3) throw new Error(`Expected at least 3 rides, got ${h1.data.rides.length}`);
        console.log('✅ Default history returned completed rides');

        console.log('2. Search Filter (Gulberg)...');
        const h2 = await fetchJSON(`${baseUrl}/api/v1/rides/history?searchQuery=Gulberg`, { 'Authorization': `Bearer ${pToken}` });
        if (h2.data.rides.length !== 1) throw new Error(`Expected 1 ride, got ${h2.data.rides.length}`);
        if (h2.data.rides[0].pickup_address !== 'Gulberg') throw new Error(`Expected Gulberg, got ${h2.data.rides[0].pickup_address}`);
        console.log('✅ Search filter successfully returned matching address');

        console.log('3. Search Counterparty (Drv21)...');
        const h3 = await fetchJSON(`${baseUrl}/api/v1/rides/history?searchQuery=Drv21`, { 'Authorization': `Bearer ${pToken}` });
        if (h3.data.rides.length < 3) throw new Error(`Expected all rides for counterparty, got ${h3.data.rides.length}`);
        console.log('✅ Search filter successfully matched counterparty name');

        console.log('4. Single Ride Summary...');
        const s1 = await fetchJSON(`${baseUrl}/api/v1/rides/${r1}/summary`, { 'Authorization': `Bearer ${pToken}` });
        if (s1.status !== 200) throw new Error(`Expected 200, got ${s1.status}`);
        if (s1.data.fare_breakdown.total_paid !== 500) throw new Error(`Expected fare 500, got ${s1.data.fare_breakdown.total_paid}`);
        if (s1.data.ratings.given.rating !== 5) throw new Error(`Expected rating 5, got ${s1.data.ratings.given.rating}`);
        console.log('✅ Single ride summary returned accurate timestamp, fare, and ratings');

        console.log('5. Non-Participant 403...');
        const s2 = await fetchJSON(`${baseUrl}/api/v1/rides/${r1}/summary`, { 'Authorization': `Bearer ${otherToken}` });
        if (s2.status !== 403) throw new Error(`Expected 403, got ${s2.status}`);
        console.log('✅ Non-participant access strictly forbidden');

        console.log('ALL PHASE 21 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
