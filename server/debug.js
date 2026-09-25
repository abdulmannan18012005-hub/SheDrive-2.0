const { Client } = require('pg');
require('dotenv').config();
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query("SELECT pg_get_constraintdef(c.oid) AS constraint_def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'drivers' AND c.conname = 'drivers_vehicle_review_status_check'")).then(res => { console.log(res.rows); process.exit(0) });
