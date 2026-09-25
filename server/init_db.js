require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log("Connected to Neon DB.");

        const res = await client.query('SELECT NOW()');
        console.log("SELECT NOW():", res.rows[0].now);

        // Read file as utf16le
        let sql = fs.readFileSync('000_NEON_INIT.sql', 'utf16le');
        
        // Strip BOM
        if (sql.charCodeAt(0) === 0xFEFF) {
            sql = sql.slice(1);
        }
        
        console.log("Executing 000_NEON_INIT.sql (length:", sql.length, ")");
        
        // Execute the sql
        await client.query(sql);
        console.log("Database initialized successfully.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
