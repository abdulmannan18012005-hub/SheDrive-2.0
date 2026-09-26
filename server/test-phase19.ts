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
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Pass', '03001234567', 'pass@test.com', 'passenger', '12345-1234567-1', 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [passengerId, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Drv', '03007654321', 'drv@test.com', 'driver', '12345-1234567-2', 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [driverId, now]);
    
    // Ensure migrations complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'in_progress', 'mini', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 5.0, 10, 550, 550, 550, $4, $4) ON CONFLICT DO NOTHING", [rideId, passengerId, driverId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM payment_transactions WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM driver_subscriptions WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
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
    console.log('Starting Phase 19 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Testing Ride Completion Endpoint...');
        const completeRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/complete`, 'POST', {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        });
        
        if (completeRes.status !== 200) throw new Error(`Expected Complete 200, got ${completeRes.status}: ${JSON.stringify(completeRes.data)}`);
        
        const rideCheck = await pool.query("SELECT status, updated_at FROM rides WHERE ride_id = $1", [rideId]);
        if (rideCheck.rows[0].status !== 'completed') throw new Error('Ride status not completed');
        console.log('✅ Ride completed successfully in DB');

        const txCheck = await pool.query("SELECT * FROM payment_transactions WHERE ride_id = $1", [rideId]);
        if (txCheck.rowCount !== 1) throw new Error('Payment transaction not created');
        if (parseFloat(txCheck.rows[0].amount) !== 550) throw new Error('Incorrect tx amount');
        console.log('✅ Payment transaction ledger entry verified');

        console.log('2. Testing Driver Earnings Summary...');
        const earnRes = await fetchJSON(`${baseUrl}/api/v1/driver/earnings/summary`, 'GET', {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        });
        
        if (earnRes.status !== 200) throw new Error(`Expected Summary 200, got ${earnRes.status}`);
        if (earnRes.data.today_earnings < 550) throw new Error('Today earnings missing transaction amount');
        if (earnRes.data.today_trips < 1) throw new Error('Today trips not incremented');
        console.log('✅ Driver earnings successfully calculated dynamically');

        console.log('3. Testing Driver Monthly Account...');
        const accountRes = await fetchJSON(`${baseUrl}/api/v1/driver/monthly-account`, 'GET', {
            'Authorization': `Bearer ${driverToken}`,
            'Content-Type': 'application/json'
        });
        
        if (accountRes.status !== 200) throw new Error(`Expected Monthly Account 200, got ${accountRes.status}`);
        if (!accountRes.data.billing_month) throw new Error('Billing month missing');
        console.log('✅ Monthly account fetched successfully');

        console.log('ALL PHASE 19 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
