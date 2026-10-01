import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `p24-${Date.now()}`;
const driverId = `d24-${Date.now()}`;
const outsiderId = `o24-${Date.now()}`;
const r1 = `r24-1-${Date.now()}`;

const pToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
const dToken = sign({ id: driverId, role: 'driver' }, TEST_SECRET, { expiresIn: '1h' });
const oToken = sign({ id: outsiderId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });

async function setupTestData() {
    const now = Date.now();
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id VARCHAR NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
        sender_id VARCHAR NOT NULL REFERENCES users(id),
        recipient_id VARCHAR NOT NULL REFERENCES users(id),
        message_text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_ride_created ON chat_messages(ride_id, created_at)`);

    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, is_verified, created_at, updated_at) VALUES ($1, 'Pass24', $2, $3, 'passenger', $4, 'hash', true, $5, $5) ON CONFLICT DO NOTHING", [passengerId, `03${now.toString().slice(-9)}`, `p24${now}@test.com`, `12345-${now.toString().slice(-7)}-1`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, is_verified, created_at, updated_at) VALUES ($1, 'Drv24', $2, $3, 'driver', $4, 'hash', true, $5, $5) ON CONFLICT DO NOTHING", [driverId, `04${now.toString().slice(-9)}`, `d24${now}@test.com`, `12345-${now.toString().slice(-7)}-2`, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, is_verified, created_at, updated_at) VALUES ($1, 'Outsider24', $2, $3, 'passenger', $4, 'hash', true, $5, $5) ON CONFLICT DO NOTHING", [outsiderId, `05${now.toString().slice(-9)}`, `o24${now}@test.com`, `12345-${now.toString().slice(-7)}-3`, now]);
    
    await pool.query("INSERT INTO drivers (driver_id, is_online, rating, total_rides, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, last_location_update) VALUES ($1, true, 4.8, 10, 'Toyota', 'Corolla', 'LHR-24', 'Silver', $2) ON CONFLICT DO NOTHING", [driverId, now]);

    // Active Ride
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'accepted', 'car_ac', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 10.0, 20, 500, 500, 500, $4, $4)", [r1, passengerId, driverId, now]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM chat_messages WHERE ride_id = $1", [r1]);
    await pool.query("DELETE FROM rides WHERE ride_id = $1", [r1]);
    await pool.query("DELETE FROM drivers WHERE driver_id = $1", [driverId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [passengerId, driverId, outsiderId]);
    await pool.end();
}

function fetchRequest(url: string, method: string, headers: any, body?: any): Promise<{status: number, data: string}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 500, data }));
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('Starting Phase 24 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Passenger sends message...');
        const res1 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/messages`, 'POST', 
            { 'Authorization': `Bearer ${pToken}`, 'Content-Type': 'application/json' },
            { message_text: 'Waiting at main gate' });
        if (res1.status !== 201) throw new Error(`Expected 201, got ${res1.status}. ${res1.data}`);
        console.log('✅ Passenger sent message');

        console.log('2. Driver fetches unread count...');
        const res2 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/unread-count`, 'GET', { 'Authorization': `Bearer ${dToken}` });
        if (res2.status !== 200) throw new Error(`Expected 200, got ${res2.status}`);
        const unreadData = JSON.parse(res2.data);
        if (unreadData.unread_count !== 1) throw new Error('Unread count is not 1');
        console.log('✅ Unread count fetched and correctly shows 1');

        console.log('3. Driver fetches messages...');
        const res3 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/messages`, 'GET', { 'Authorization': `Bearer ${dToken}` });
        if (res3.status !== 200) throw new Error(`Expected 200, got ${res3.status}`);
        const messagesData = JSON.parse(res3.data);
        if (messagesData.messages.length !== 1) throw new Error('Driver missing message');
        if (messagesData.messages[0].is_read !== true) throw new Error('Message not marked as read automatically');
        console.log('✅ Driver fetched messages and marked as read');

        console.log('4. Driver replies...');
        const res4 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/messages`, 'POST', 
            { 'Authorization': `Bearer ${dToken}`, 'Content-Type': 'application/json' },
            { message_text: 'I have arrived outside' });
        if (res4.status !== 201) throw new Error(`Expected 201, got ${res4.status}`);
        console.log('✅ Driver replied successfully');

        console.log('5. Transition ride to completed and attempt sending...');
        await pool.query("UPDATE rides SET status = 'completed' WHERE ride_id = $1", [r1]);
        const res5 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/messages`, 'POST', 
            { 'Authorization': `Bearer ${pToken}`, 'Content-Type': 'application/json' },
            { message_text: 'Thanks!' });
        if (res5.status !== 400) throw new Error(`Expected 400, got ${res5.status}`);
        console.log('✅ Completed ride safely blocked chat message (HTTP 400)');

        console.log('6. Unauthorized outsider attempt...');
        const res6 = await fetchRequest(`${baseUrl}/api/v1/rides/${r1}/chat/messages`, 'GET', { 'Authorization': `Bearer ${oToken}` });
        if (res6.status !== 403) throw new Error(`Expected 403, got ${res6.status}`);
        console.log('✅ Outsider securely blocked (HTTP 403)');

        console.log('ALL PHASE 24 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
