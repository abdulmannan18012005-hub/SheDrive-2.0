import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export const checkDbConnection = async (): Promise<boolean> => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    } catch (err) {
        console.error('Database connection error:', err);
        return false;
    }
};
