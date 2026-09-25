import app from './src/index';
import { pool } from './src/config/db';
import { sign } from 'jsonwebtoken';
import http from 'http';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';
const passengerId = `test-pass-${Date.now()}`;
const driverId = `test-drv-${Date.now()}`;
const rideId = `test-ride-${Date.now()}`;
const passengerToken = sign({ id: passengerId, role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });

async function setupTestData() {
    const now = Date.now();
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Passenger SOS', '03001234567', 'pass@test.com', 'passenger', '12345-1234567-1', 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [passengerId, now]);
    await pool.query("INSERT INTO users (id, name, phone, email, role, cnic, password_hash, created_at, updated_at) VALUES ($1, 'Driver SOS', '03007654321', 'drv@test.com', 'driver', '12345-1234567-2', 'dummyhash', $2, $2) ON CONFLICT DO NOTHING", [driverId, now]);
    
    // Ensure migrations have time to complete before inserting rides (since app load triggers them)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await pool.query("INSERT INTO rides (ride_id, passenger_id, driver_id, status, vehicle_category, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, distance_km, duration_min, estimated_fare, offered_fare, final_fare, created_at, updated_at) VALUES ($1, $2, $3, 'in_progress', 'mini', 31.5, 74.3, 'Pickup', 31.6, 74.4, 'Dropoff', 5.0, 10, 500, 500, 500, $4, $4) ON CONFLICT DO NOTHING", [rideId, passengerId, driverId, now]);
    
    // Clear old emergency contacts for this test user
    await pool.query("DELETE FROM emergency_contacts WHERE user_id = $1", [passengerId]);
}

async function cleanupTestData() {
    await pool.query("DELETE FROM emergency_alerts WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM ride_shares WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM rides WHERE ride_id = $1", [rideId]);
    await pool.query("DELETE FROM emergency_contacts WHERE user_id = $1", [passengerId]);
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
    console.log('Starting Phase 18 Tests...');
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    try {
        await setupTestData();

        console.log('1. Testing Emergency Contacts Max 5 Constraint...');
        for (let i = 1; i <= 5; i++) {
            const res = await fetchJSON(`${baseUrl}/api/v1/emergency/contacts`, 'POST', {
                'Authorization': `Bearer ${passengerToken}`,
                'Content-Type': 'application/json'
            }, { name: `Contact ${i}`, phone: `0300000000${i}`, relationship: 'Friend' });
            
            if (res.status !== 201) throw new Error(`Failed to add contact ${i}: ${JSON.stringify(res.data)}`);
        }
        
        // 6th contact should fail
        const failRes = await fetchJSON(`${baseUrl}/api/v1/emergency/contacts`, 'POST', {
                'Authorization': `Bearer ${passengerToken}`,
                'Content-Type': 'application/json'
        }, { name: `Contact 6`, phone: `03000000006`, relationship: 'Friend' });
        
        if (failRes.status !== 400) throw new Error(`Expected 400 for 6th contact, got ${failRes.status}`);
        console.log('✅ Max 5 Contacts constraint verified');

        console.log('2. Testing SOS Dispatch Endpoint...');
        const sosRes = await fetchJSON(`${baseUrl}/api/v1/rides/${rideId}/sos`, 'POST', {
            'Authorization': `Bearer ${passengerToken}`,
            'Content-Type': 'application/json'
        }, { latitude: 31.5, longitude: 74.3, reason: 'Test Emergency' });
        
        if (sosRes.status !== 201) throw new Error(`Expected SOS 201, got ${sosRes.status}: ${JSON.stringify(sosRes.data)}`);
        if (sosRes.data.contacts_notified !== 5) throw new Error(`Expected 5 contacts notified, got ${sosRes.data.contacts_notified}`);
        console.log('✅ SOS Dispatched successfully with tracking payload');

        const alertCheck = await pool.query("SELECT * FROM emergency_alerts WHERE ride_id = $1", [rideId]);
        if (alertCheck.rowCount !== 1) throw new Error('Emergency alert row not created');
        console.log('✅ Emergency alert row created in PostgreSQL');

        const flagCheck = await pool.query("SELECT has_active_emergency FROM rides WHERE ride_id = $1", [rideId]);
        if (flagCheck.rows[0].has_active_emergency !== true) throw new Error('Ride active emergency flag not set');
        console.log('✅ Ride has_active_emergency flag set correctly');

        console.log('ALL PHASE 18 TESTS PASSED SUCCESSFULLY');
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        await cleanupTestData();
        server.close();
    }
}

runTests();
