import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `p22-${Date.now()}`;
const driverId = `d22-${Date.now()}`;
const otherId = `p22-other-${Date.now()}`;

const pToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
const otherToken = sign({ id: otherId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });

const r1 = `r22-1-${Date.now()}`;
const r2 = `r22-2-${Date.now()}`;

async function setupTestData() {
    const now = Date.now();
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Pass22', $2, $3, 'passenger', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [passengerId, `03${now.toString().slice(-9)}`, `p1${now}@test.com`, `12345-${now.toString().slice(-7)}-1`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Drv22', $2, $3, 'driver', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [driverId, `04${now.toString().slice(-9)}`, `d1${now}@test.com`, `12345-${now.toString().slice(-7)}-2`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Other22', $2, $3, 'passenger', $4, 'hash', $5, $5) ON CONFLICT DO NOTHING", [otherId, `05${now.toString().slice(-9)}`, `o1${now}@test.com`, `12345-${now.toString().slice(-7)}-3`, now]);
    
    await pool.query("INSERT INTO drivers (driver_id, is_online, rating, total_rides, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, last_location_update) VALUES ($1, true, 4.5, 10, 'Honda', 'Civic', 'LHR-22', 'White', $2) ON CONFLICT DO NOTHING", [driverId, now]);

    // Rides
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'car_ac', 31.5, 74.3, 'Pickup 1', 31.6, 74.4, 'Dropoff 1', 10.0, 20, 500, 500, 500, $4, $4)", [r1, passengerId, driverId, now - 10000]);
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'car_ac', 31.5, 74.3, 'Pickup 2, with comma', 31.6, 74.4, 'Dropoff 2', 15.0, 30, 800, 800, 800, $4, $4)", [r2, passengerId, driverId, now - 5000]);

    await pool.query("INSERT INTO payment_transactions (id, ride_id, user_id, provider, payer_id, payee_id, amount, payment_method, status, created_at, updated_at) VALUES ($1, $2, $3, 'cash', $4, $5, 500, 'cash', 'success', $6, $6)", [`tx-${r1}`, r1, driverId, passengerId, driverId, now]);
    await pool.query("INSERT INTO payment_transactions (id, ride_id, user_id, provider, payer_id, payee_id, amount, payment_method, status, created_at, updated_at) VALUES ($1, $2, $3, 'cash', $4, $5, 800, 'cash', 'success', $6, $6)", [`tx-${r2}`, r2, driverId, passengerId, driverId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM payment_transactions WHERE ride_id IN ($1, $2)", [r1, r2]);
    await pool.query("DELETE FROM rides WHERE ride_id IN ($1, $2)", [r1, r2]);
    await pool.query("DELETE FROM drivers WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [passengerId, driverId, otherId]);
    await pool.end();
}

function fetch(url: string, headers: any): Promise<{status: number, headers: any, data: string}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'GET', headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 500, headers: res.headers, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 22 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Single Receipt JSON...');
        const res1 = await fetch(`${baseUrl}/api/v1/rides/${r1}/receipt`, { 'Authorization': `Bearer ${pToken}` });
        if (res1.status !== 200) throw new Error(`Expected 200, got ${res1.status}`);
        const receipt = JSON.parse(res1.data);
        if (!receipt.receipt_number.startsWith('SHD-RC-')) throw new Error(`Invalid prefix: ${receipt.receipt_number}`);
        if (receipt.fare_breakdown.total_paid !== 500) throw new Error('Incorrect fare parsing');
        console.log('✅ JSON Receipt generated successfully with correct prefix and fare');

        console.log('2. Unauthorized Access (403)...');
        const res2 = await fetch(`${baseUrl}/api/v1/rides/${r1}/receipt`, { 'Authorization': `Bearer ${otherToken}` });
        if (res2.status !== 403) throw new Error(`Expected 403, got ${res2.status}`);
        console.log('✅ Non-participant access strictly forbidden');

        console.log('3. CSV Bulk Export...');
        const res3 = await fetch(`${baseUrl}/api/v1/rides/export/csv`, { 'Authorization': `Bearer ${pToken}` });
        if (res3.status !== 200) throw new Error(`Expected 200, got ${res3.status}`);
        if (!res3.headers['content-type'].includes('text/csv')) throw new Error('Invalid Content-Type');
        
        const lines = res3.data.trim().split('\\n');
        if (!lines[0].includes('Trip ID,Date,Status,Category')) throw new Error('Invalid CSV Headers');
        
        // Find row for r2 which has a comma
        const r2Line = lines.find(l => l.includes(r2));
        if (!r2Line) throw new Error('Export missing seeded row');
        if (!r2Line.includes('"Pickup 2, with comma"')) throw new Error('CSV escaping failed');
        console.log('✅ CSV exported cleanly with RFC 4180 escaping and correct headers');

        console.log('ALL PHASE 22 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
