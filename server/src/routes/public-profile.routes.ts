import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/profiles/driver/:driverId
router.get('/driver/:driverId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { driverId } = req.params;

        const driverRes = await pool.query(`
            SELECT u.id, u.name as full_name, u.avatar_url, u.is_verified, u.created_at,
                   d.rating, d.total_rides,
                   d.vehicle_make, d.vehicle_model, d.vehicle_color, d.vehicle_plate, d.vehicle_category, d.vehicle_photo_url
            FROM users u
            INNER JOIN drivers d ON d.driver_id = u.id
            WHERE u.id = $1 AND u.role = 'driver'
        `, [driverId]);

        if (driverRes.rowCount === 0) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        const row = driverRes.rows[0];

        // Aggregate tags
        const tagsRes = await pool.query(`
            SELECT unnest(tags) AS tag, COUNT(*) AS count 
            FROM ratings 
            WHERE rated_id = $1 
            GROUP BY tag 
            ORDER BY count DESC
        `, [driverId]);

        // Completed trips explicitly count
        const ridesRes = await pool.query(`
            SELECT COUNT(*) FROM rides WHERE driver_id = $1 AND status = 'completed'
        `, [driverId]);

        const total_rides = parseInt(ridesRes.rows[0].count || '0', 10);
        const nameParts = row.full_name ? row.full_name.split(' ') : ['Unknown'];
        const firstName = nameParts[0];

        const payload = {
            driver_id: row.id,
            first_name: firstName,
            avatar_url: row.avatar_url || null,
            rating: parseFloat(row.rating) || 5.0,
            total_rides: total_rides,
            member_since: new Date(parseInt(row.created_at)).toISOString(),
            is_verified: row.is_verified || false,
            vehicle: {
                make: row.vehicle_make,
                model: row.vehicle_model,
                color: row.vehicle_color,
                plate_number: row.vehicle_plate,
                category: row.vehicle_category,
                photo_url: row.vehicle_photo_url || null
            },
            badges: row.is_verified ? ["Verified Female Driver", "Background Checked"] : [],
            tag_counts: tagsRes.rows.map(t => ({ tag: t.tag, count: parseInt(t.count, 10) }))
        };

        res.json(payload);
    } catch (error) {
        console.error('Driver Profile Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/profiles/passenger/:passengerId
router.get('/passenger/:passengerId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { passengerId } = req.params;

        const passRes = await pool.query(`
            SELECT u.id, u.name as full_name, u.avatar_url, u.is_verified, u.created_at
            FROM users u
            WHERE u.id = $1 AND u.role = 'passenger'
        `, [passengerId]);

        if (passRes.rowCount === 0) {
            res.status(404).json({ error: 'Passenger profile not found' });
            return;
        }

        const row = passRes.rows[0];

        // Aggregate tags
        const tagsRes = await pool.query(`
            SELECT unnest(tags) AS tag, COUNT(*) AS count 
            FROM ratings 
            WHERE rated_id = $1 
            GROUP BY tag 
            ORDER BY count DESC
        `, [passengerId]);

        // Aggregated rating mapping directly from ratings
        const ratingAggRes = await pool.query(`
            SELECT AVG(rating) as avg_rating
            FROM ratings
            WHERE rated_id = $1
        `, [passengerId]);

        // Completed trips explicitly count
        const ridesRes = await pool.query(`
            SELECT COUNT(*) FROM rides WHERE passenger_id = $1 AND status = 'completed'
        `, [passengerId]);

        const total_rides = parseInt(ridesRes.rows[0].count || '0', 10);
        const nameParts = row.full_name ? row.full_name.split(' ') : ['Unknown'];
        const firstName = nameParts[0];
        const rating = ratingAggRes.rows[0].avg_rating ? parseFloat(ratingAggRes.rows[0].avg_rating) : 5.0;

        const payload = {
            passenger_id: row.id,
            first_name: firstName,
            avatar_url: row.avatar_url || null,
            rating: rating,
            total_rides: total_rides,
            member_since: new Date(parseInt(row.created_at)).toISOString(),
            is_verified: row.is_verified || false,
            safety_badge: row.is_verified ? "Verified Female Passenger" : "Unverified Passenger",
            tag_counts: tagsRes.rows.map(t => ({ tag: t.tag, count: parseInt(t.count, 10) }))
        };

        res.json(payload);
    } catch (error) {
        console.error('Passenger Profile Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
