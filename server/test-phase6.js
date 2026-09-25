const { spawn } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3003' } });

server.stdout.on('data', (data) => {
  if (data.toString().includes('Server running')) {
     runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERR] ${data}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// A dummy JWT for the mock user "test_user_p6" with UUID
const jwt = require('jsonwebtoken');
const testUserId = '99999999-9999-9999-9999-999999999999';
const token = jwt.sign({ id: testUserId, role: 'passenger' }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });

async function runTests() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Ensure test user exists
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(50),
            avatar_url TEXT,
            push_notifications_enabled BOOLEAN DEFAULT true,
            sound_enabled BOOLEAN DEFAULT true,
            ride_updates_enabled BOOLEAN DEFAULT true,
            session_version INT DEFAULT 1
        );
    `);
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS app_feedback (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            category VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            created_at BIGINT,
            updated_at BIGINT
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS saved_places (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            label VARCHAR(50) NOT NULL,
            name VARCHAR(255),
            address TEXT,
            latitude DECIMAL NOT NULL,
            longitude DECIMAL NOT NULL,
            created_at BIGINT,
            updated_at BIGINT
        );
    `);

    // Add missing columns if users table existed from Phase 2 but lacks these
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ride_updates_enabled BOOLEAN DEFAULT true;`);
    await client.query("DELETE FROM users WHERE id = $1", [testUserId]);
    await client.query("INSERT INTO users (id, email, password_hash, name, phone, role, cnic, created_at, updated_at) VALUES ($1, 'testp6@example.com', 'hash', 'Test User', '1234567890', 'passenger', '1234567890123', 1700000000000, 1700000000000)", [testUserId]);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    console.log('Running Profile/Settings/Places/Feedback Flow tests...');
    
    // 1. Settings Update
    const rSet = await fetch('http://localhost:3003/api/v1/profile/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ push_notifications_enabled: false, sound_enabled: false })
    });
    if (rSet.status !== 200) throw new Error(`Failed settings update: ${rSet.status}`);
    const jSet = await rSet.json();
    if (jSet.settings.push_notifications_enabled !== false) throw new Error('Settings not updated properly');
    console.log('✅ Settings update passed');

    // 2. Add Place
    const rAddPlace = await fetch('http://localhost:3003/api/v1/places', {
        method: 'POST',
        headers,
        body: JSON.stringify({ label: 'home', name: 'My House', address: '123 Main St', latitude: 31.5204, longitude: 74.3587 })
    });
    if (rAddPlace.status !== 201) throw new Error(`Failed to add place: ${rAddPlace.status}`);
    const newPlace = await rAddPlace.json();
    console.log('✅ Add place passed');

    // 3. Get Places
    const rGetPlaces = await fetch('http://localhost:3003/api/v1/places', {
        method: 'GET',
        headers
    });
    if (rGetPlaces.status !== 200) throw new Error(`Failed to get places: ${rGetPlaces.status}`);
    const jGetPlaces = await rGetPlaces.json();
    if (jGetPlaces.places.length === 0) throw new Error('Places list empty after insert');
    console.log('✅ Retrieve places passed');

    // 4. Delete Place
    const rDelPlace = await fetch(`http://localhost:3003/api/v1/places/${newPlace.place.id}`, {
        method: 'DELETE',
        headers
    });
    if (rDelPlace.status !== 200) throw new Error(`Failed to delete place: ${rDelPlace.status}`);
    console.log('✅ Delete place passed');

    // 5. Submit Feedback
    const rFeed = await fetch('http://localhost:3003/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ category: 'Bug', message: 'The app is great, just testing!' })
    });
    if (rFeed.status !== 201) throw new Error(`Failed to submit feedback: ${rFeed.status}`);
    console.log('✅ Submit feedback passed');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    // Cleanup
    await client.query("DELETE FROM saved_places WHERE user_id = $1", [testUserId]);
    await client.query("DELETE FROM app_feedback WHERE user_id = $1", [testUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [testUserId]);
    await client.end();
    server.kill();
    process.exit(0);
  }
}
