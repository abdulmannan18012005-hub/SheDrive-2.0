const { spawn } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const server = spawn(npx, ['tsx', 'src/index.ts'], { cwd: __dirname, shell: true, env: { ...process.env, PORT: '3002' } });

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

async function runTests() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Create tables safely if not exist before cleaning up
    await client.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            reset_token VARCHAR(255),
            expires_at TIMESTAMP NOT NULL,
            attempts INT DEFAULT 0,
            is_used BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            session_version INT DEFAULT 1
        );
    `);

    // Clear out the test email
    await client.query("DELETE FROM password_resets WHERE email = 'test@example.com'");
    await client.query("DELETE FROM users WHERE email = 'test@example.com'");

    console.log('Running OTP Flow tests...');
    
    // 1. Request OTP
    const r1 = await fetch('http://localhost:3002/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
    });
    if (r1.status !== 200) throw new Error('Failed to request OTP');

    // Manually extract the code from DB
    const bcrypt = require('bcryptjs');
    const knownHash = await bcrypt.hash('123456', 10);
    await client.query("UPDATE password_resets SET code_hash = $1 WHERE email = 'test@example.com'", [knownHash]);
    
    // 2. Invalid Attempt Lockout Test
    for (let i = 0; i < 3; i++) {
        const rErr = await fetch('http://localhost:3002/api/v1/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', otp: '000000' }) // Wrong OTP
        });
        if (i < 2) {
            if (rErr.status !== 400) throw new Error('Expected 400 for invalid OTP attempt');
        } else {
            if (rErr.status !== 429) throw new Error(`Expected 429 for lockout, got ${rErr.status}`);
        }
    }
    console.log('✅ Invalid attempt lockout passed');

    // Need a new OTP
    await fetch('http://localhost:3002/api/v1/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
    });
    await client.query("UPDATE password_resets SET code_hash = $1 WHERE email = 'test@example.com' AND is_used = false", [knownHash]);

    // 3. Expiry Test
    await client.query("UPDATE password_resets SET expires_at = NOW() - INTERVAL '10 minutes' WHERE email = 'test@example.com' AND is_used = false");
    const rExp = await fetch('http://localhost:3002/api/v1/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', otp: '123456' })
    });
    if (rExp.status !== 400) throw new Error(`Expected 400 for expired OTP, got ${rExp.status}`);
    console.log('✅ Expiry logic passed');

    // Need a new OTP
    await fetch('http://localhost:3002/api/v1/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
    });
    await client.query("UPDATE password_resets SET code_hash = $1 WHERE email = 'test@example.com' AND is_used = false", [knownHash]);

    // 4. Successful Verification
    const rVer = await fetch('http://localhost:3002/api/v1/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', otp: '123456' })
    });
    if (rVer.status !== 200) throw new Error(`Failed to verify OTP: ${rVer.status}`);
    const jVer = await rVer.json();
    const resetToken = jVer.resetToken;
    console.log('✅ Successful OTP verification passed');

    // 5. Reset Password
    const rRes = await fetch('http://localhost:3002/api/v1/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', resetToken, newPassword: 'NewPassword123' })
    });
    if (rRes.status !== 200) throw new Error(`Failed to reset password: ${rRes.status}`);
    console.log('✅ Password reset passed');

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await client.end();
    server.kill();
    process.exit(0);
  }
}
