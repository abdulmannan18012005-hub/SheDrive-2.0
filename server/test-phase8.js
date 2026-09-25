const { spawn } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3006' } });

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERR] ${data}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const adminUserId = '77777777-7777-7777-7777-777777777777';
const testDriverId = '66666666-6666-6666-6666-666666666666';

const adminToken = jwt.sign({ id: adminUserId, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });
const driverToken = jwt.sign({ id: testDriverId, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', { expiresIn: '1h' });

async function runTests() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Create base tables (if not exist)
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(50),
            role VARCHAR(50) NOT NULL,
            cnic VARCHAR(50) NOT NULL,
            is_verified BOOLEAN DEFAULT false,
            created_at BIGINT,
            updated_at BIGINT
        );
    `);

    // Ensure is_verified exists on users if already created
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;`);

    await client.query(`
        CREATE TABLE IF NOT EXISTS drivers (
            driver_id VARCHAR(36) PRIMARY KEY,
            vehicle_make VARCHAR(100),
            vehicle_model VARCHAR(100),
            vehicle_year INT,
            vehicle_color VARCHAR(50),
            vehicle_plate VARCHAR(50),
            vehicle_category VARCHAR(50),
            vehicle_review_status VARCHAR(50) DEFAULT 'pending',
            vehicle_review_notes TEXT,
            rating DECIMAL(3, 2) DEFAULT 5.00,
            cnic_front_url TEXT,
            cnic_back_url TEXT,
            license_front_url TEXT,
            vehicle_photo_url TEXT,
            registration_url TEXT,
            last_location_update BIGINT
        );
    `);

    // Clean up
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%${testDriverId}%`]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [adminUserId, testDriverId]);
    
    const hash = await bcrypt.hash('password123', 10);
    
    // Seed Admin
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, is_verified, created_at, updated_at) VALUES ($1, 'adminp8@example.com', $2, 'Admin User', '000000', 'admin', '000', true, 1700000000000, 1700000000000)", [adminUserId, hash]);
    
    // Seed Pending Driver
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, is_verified, created_at, updated_at) VALUES ($1, 'driverp8@example.com', 'hash', 'Test Driver 8', '11111', 'driver', '111', false, 1700000000000, 1700000000000)", [testDriverId]);
    await client.query("INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, vehicle_category, vehicle_review_status, last_location_update) VALUES ($1, 'Toyota', 'Corolla', 2022, 'White', 'ABC-123', 'car_ac', 'pending', 1700000000000)", [testDriverId]);

    const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
    const driverHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` };

    console.log('Running Admin Portal tests...');
    
    // 1. RBAC Check (Driver tries to access admin route)
    const rForbidden = await fetch('http://localhost:3006/api/v1/admin/drivers/pending', { method: 'GET', headers: driverHeaders });
    if (rForbidden.status !== 403) throw new Error(`Expected 403 Forbidden for driver, got ${rForbidden.status}`);
    console.log('✅ RBAC 403 Forbidden passed');

    // 2. Admin fetches pending drivers
    const rPending = await fetch('http://localhost:3006/api/v1/admin/drivers/pending', { method: 'GET', headers: adminHeaders });
    if (rPending.status !== 200) throw new Error(`Expected 200 for pending drivers, got ${rPending.status}`);
    const jPending = await rPending.json();
    if (!jPending.drivers || !jPending.drivers.find((d) => d.driver_id === testDriverId)) throw new Error('Pending driver not found in queue');
    console.log('✅ Pending Queue retrieval passed');

    // 3. Admin approves driver
    const rApprove = await fetch(`http://localhost:3006/api/v1/admin/drivers/${testDriverId}/verify`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'approved' })
    });
    if (rApprove.status !== 200) throw new Error(`Expected 200 for approval, got ${rApprove.status}`);
    
    // Verify DB update
    const verifyCheck = await client.query('SELECT is_verified FROM users WHERE id = $1', [testDriverId]);
    if (verifyCheck.rows[0].is_verified !== true) throw new Error('is_verified not set to true in DB');
    console.log('✅ Driver approval persistence passed');

    // 4. Verify Audit Log entry
    const auditCheck = await client.query("SELECT * FROM audit_logs WHERE details LIKE $1 AND action = 'APPROVE_DRIVER'", [`%${testDriverId}%`]);
    if (auditCheck.rows.length === 0) throw new Error('Audit log entry not found for approval');
    console.log('✅ Audit log persistence passed');

    // 5. Admin rejects driver
    const rReject = await fetch(`http://localhost:3006/api/v1/admin/drivers/${testDriverId}/verify`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'rejected', rejection_reason: 'Blurry CNIC' })
    });
    if (rReject.status !== 200) throw new Error(`Expected 200 for rejection, got ${rReject.status}`);
    
    const verifyCheck2 = await client.query('SELECT is_verified FROM users WHERE id = $1', [testDriverId]);
    if (verifyCheck2.rows[0].is_verified !== false) throw new Error('is_verified not set to false in DB on rejection');
    
    const rejectNotes = await client.query('SELECT vehicle_review_notes FROM drivers WHERE driver_id = $1', [testDriverId]);
    if (rejectNotes.rows[0].vehicle_review_notes !== 'Blurry CNIC') throw new Error('Rejection notes not persisted');
    
    const auditCheck2 = await client.query("SELECT * FROM audit_logs WHERE details LIKE $1 AND action = 'REJECT_DRIVER'", [`%${testDriverId}%`]);
    if (auditCheck2.rows.length === 0) throw new Error('Audit log entry not found for rejection');
    
    console.log('✅ Driver rejection logic & audit log passed');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.query("DELETE FROM audit_logs WHERE details LIKE $1", [`%${testDriverId}%`]);
    await client.query("DELETE FROM drivers WHERE driver_id = $1", [testDriverId]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [adminUserId, testDriverId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}

// Give server time to start
setTimeout(runTests, 2000);
