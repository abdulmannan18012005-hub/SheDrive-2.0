import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `test-pass-${Date.now()}`;
const driverId = `test-drv-${Date.now()}`;
const rideId = `test-ride-${Date.now()}`;
const passengerToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
const driverToken = sign({ id: driverId, role: 'driver' }, TEST_SECRET, { expiresIn: '1h' });

async function setupTestData() {
    const now = Date.now();
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Pass', $3, $4, 'passenger', $5, 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [passengerId, now, `03${now.toString().slice(-9)}`, `p${now}@test.com`, `12345-${now.toString().slice(-7)}-1`]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Drv', $3, $4, 'driver', $5, 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [driverId, now, `04${now.toString().slice(-9)}`, `d${now}@test.com`, `12345-${now.toString().slice(-7)}-2`]);
    await pool.query("INSERT INTO drivers (driver_id, is_online, rating, total_rides, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, last_location_update) VALUES ($1, true, 0.0, 0, 'Toyota', 'Corolla', 'LEA-123', 'White', $2) ON CONFLICT DO NOTHING", [driverId, now]);

    // Ensure migrations complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a completed ride
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'mini', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 5.0, 10, 550, 550, 550, $4, $4) ON CONFLICT DO NOTHING", [rideId, passengerId, driverId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM ratings WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM drivers WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [passengerId, driverId]);
    await pool.end();
}

function fetchJSON(url: string, method: string, headers: any, body?: any): Promise<{status: number, data: any}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode || 500, data: data ? JSON.parse(data) : null });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 20 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Passenger Submits 4-Star Rating...');
        const pRatingRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/rating`, 'POST', {
            'Authorization': `Bearer ${passengerToken}`,
            'Content-Type': 'application/json'
        }, {
            rating: 4,
            tags: ['Safe Driving', 'Clean Car'],
            comment: 'Good trip!'
        });
        
        if (pRatingRes.status !== 201) throw new Error(`Expected 201, got ${pRatingRes.status}: ${JSON.stringify(pRatingRes.data)}`);
        
        const ratingCheck = await pool.query("SELECT * FROM ratings WHERE ride_id = $1 AND rater_id = $2", [rideId, passengerId]);
        if (ratingCheck.rowCount !== 1) throw new Error('Rating not created in DB');
        if (ratingCheck.rows[0].tags.length !== 2) throw new Error('Tags not saved correctly');
        console.log('✅ Passenger rating submitted and verified in DB');

        console.log('2. Duplicate Rating Check...');
        const dupRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/rating`, 'POST', {
            'Authorization': `Bearer ${passengerToken}`,
            'Content-Type': 'application/json'
        }, {
            rating: 5
        });
        
        if (dupRes.status !== 400) throw new Error(`Expected Duplicate Rejection 400, got ${dupRes.status}`);
        console.log('✅ Duplicate rating correctly rejected');

        console.log('3. Driver Average Rating Recalculation Check...');
        const driverCheck = await pool.query("SELECT rating FROM drivers WHERE driver_id = $1", [driverId]);
        if (parseFloat(driverCheck.rows[0].rating) !== 4.0) throw new Error(`Driver rating not updated, got ${driverCheck.rows[0].rating}`);
        console.log('✅ Driver aggregate rating dynamically recalculated');

        console.log('4. Driver Submits Passenger Rating...');
        const dRatingRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/rating`, 'POST', {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        }, {
            rating: 5,
            tags: ['Polite']
        });
        
        if (dRatingRes.status !== 201) throw new Error(`Expected Driver Rating 201, got ${dRatingRes.status}`);
        const totalRatings = await pool.query("SELECT * FROM ratings WHERE ride_id = $1", [rideId]);
        if (totalRatings.rowCount !== 2) throw new Error('Driver rating not persisted separately');
        console.log('✅ Driver counter-rating successful');

        console.log('5. Validation Constraint Check...');
        const invalidRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/rating`, 'POST', {
            'Authorization': `Bearer ${passengerToken}`,
            'Content-Type': 'application/json'
        }, { rating: 6 });
        
        if (invalidRes.status !== 400) throw new Error(`Expected Invalid Rating 400, got ${invalidRes.status}`);
        console.log('✅ Invalid stars rejected');

        console.log('ALL PHASE 20 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
