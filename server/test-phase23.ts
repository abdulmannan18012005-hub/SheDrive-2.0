import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `p23-${Date.now()}`;
const driverId = `d23-${Date.now()}`;
const r1 = `r23-1-${Date.now()}`;

const pToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });

async function setupTestData() {
    const now = Date.now();
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, is_verified, created_at, updated_at) VALUES ($1, 'Pass23', $2, $3, 'passenger', $4, 'hash', true, $5, $5) ON CONFLICT DO NOTHING", [passengerId, `03${now.toString().slice(-9)}`, `p23${now}@test.com`, `12345-${now.toString().slice(-7)}-1`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, is_verified, created_at, updated_at) VALUES ($1, 'Drv23', $2, $3, 'driver', $4, 'hash', true, $5, $5) ON CONFLICT DO NOTHING", [driverId, `04${now.toString().slice(-9)}`, `d23${now}@test.com`, `12345-${now.toString().slice(-7)}-2`, now]);
    
    await pool.query("INSERT INTO drivers (driver_id, is_online, rating, total_rides, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, last_location_update) VALUES ($1, true, 4.8, 10, 'Toyota', 'Corolla', 'LHR-23', 'Silver', $2) ON CONFLICT DO NOTHING", [driverId, now]);

    // Rides
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'car_ac', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 10.0, 20, 500, 500, 500, $4, $4)", [r1, passengerId, driverId, now - 10000]);

    // Ratings
    await pool.query("INSERT INTO ratings (id, ride_id, rater_id, rated_id, rater_role, rating, tags, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 'passenger', 5, ARRAY['Safe Driving', 'Clean Car', 'Safe Driving'], $4)", [r1, passengerId, driverId, now]);
    await pool.query("INSERT INTO ratings (id, ride_id, rater_id, rated_id, rater_role, rating, tags, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 'driver', 5, ARRAY['Polite', 'Punctual'], $4)", [r1, driverId, passengerId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM ratings WHERE ride_id = $1", [r1]);
    await pool.query("DELETE FROM rides WHERE ride_id = $1", [r1]);
    await pool.query("DELETE FROM drivers WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [passengerId, driverId]);
    await pool.end();
}

function fetch(url: string, headers: any): Promise<{status: number, data: string}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'GET', headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 500, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 23 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Driver Profile Dossier...');
        const res1 = await fetch(`${baseUrl}/api/v1/profiles/driver/${driverId}`, { 'Authorization': `Bearer ${pToken}` });
        if (res1.status !== 200) throw new Error(`Expected 200, got ${res1.status}`);
        const dProfile = JSON.parse(res1.data);
        
        // Assert aggregation
        const safeTag = dProfile.tag_counts.find((t: any) => t.tag === 'Safe Driving');
        if (!safeTag || safeTag.count !== 2) throw new Error('Driver tags not aggregated correctly');
        if (dProfile.total_rides !== 1) throw new Error('Total rides count mismatch');
        
        // HARD PRIVACY CHECK
        if (dProfile.phone || dProfile.email || dProfile.cnic || dProfile.license_number) {
            throw new Error('HARD PRIVACY CHECK FAILED: Driver sensitive data leaked');
        }
        console.log('✅ Driver profile passed (privacy verified, tags aggregated)');

        console.log('2. Passenger Profile Dossier...');
        const res2 = await fetch(`${baseUrl}/api/v1/profiles/passenger/${passengerId}`, { 'Authorization': `Bearer ${pToken}` });
        if (res2.status !== 200) throw new Error(`Expected 200, got ${res2.status}`);
        const pProfile = JSON.parse(res2.data);
        
        // Assert aggregation
        const politeTag = pProfile.tag_counts.find((t: any) => t.tag === 'Polite');
        if (!politeTag || politeTag.count !== 1) throw new Error('Passenger tags not aggregated correctly');
        
        // HARD PRIVACY CHECK
        if (pProfile.phone || pProfile.email || pProfile.cnic || pProfile.saved_places) {
            throw new Error('HARD PRIVACY CHECK FAILED: Passenger sensitive data leaked');
        }
        console.log('✅ Passenger profile passed (privacy verified, tags aggregated)');

        console.log('ALL PHASE 23 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
