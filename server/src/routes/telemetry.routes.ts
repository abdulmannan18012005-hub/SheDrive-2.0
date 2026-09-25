import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Ensure columns exist (running this once on module load is hacky but ensures it works without full migration system)
pool.query(`
    ALTER TABLE drivers 
    ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION DEFAULT 0.0;
`).catch(console.error);

// POST /api/v1/telemetry/location
router.post('/location', authenticateToken, requireRole('driver'), async (req: Request, res: Response): Promise<void> => {
    try {
        const driverId = (req as any).user.id;
        const { latitude, longitude, heading = 0, speed = 0 } = req.body;

        if (latitude == null || longitude == null) {
            res.status(400).json({ error: 'latitude and longitude are required' });
            return;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            res.status(400).json({ error: 'Invalid coordinates' });
            return;
        }

        const now = Date.now();
        await pool.query(
            `UPDATE drivers 
             SET latitude = $1, longitude = $2, heading = $3, speed = $4, last_location_update = $5
             WHERE driver_id = $6`,
            [latitude, longitude, heading, speed, now, driverId]
        );

        res.status(200).json({ success: true, timestamp: now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/telemetry/nearby-drivers
router.get('/nearby-drivers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { lat, lng, radius_km = 5, category } = req.query;

        if (!lat || !lng) {
            res.status(400).json({ error: 'lat and lng query parameters are required' });
            return;
        }

        const centerLat = parseFloat(lat as string);
        const centerLng = parseFloat(lng as string);
        const radius = parseFloat(radius_km as string);

        if (isNaN(centerLat) || isNaN(centerLng) || isNaN(radius)) {
            res.status(400).json({ error: 'Invalid coordinate parameters' });
            return;
        }

        // Haversine formula
        let query = `
            WITH driver_distances AS (
                SELECT d.driver_id, d.latitude, d.longitude, d.heading, d.vehicle_category,
                    (6371 * acos(cos(radians($1)) * cos(radians(d.latitude)) * cos(radians(d.longitude) - radians($2)) + sin(radians($1)) * sin(radians(d.latitude)))) AS distance
                FROM drivers d
                JOIN users u ON u.id = d.driver_id
                WHERE d.is_online = true 
                  AND d.is_available = true 
                  AND u.is_verified = true
                  AND u.is_blocked = false
            )
            SELECT * FROM driver_distances WHERE distance <= $3
        `;
        
        const params: any[] = [centerLat, centerLng, radius];
        let paramIndex = 4;

        if (category) {
            query += ` AND vehicle_category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        query += ` ORDER BY distance ASC LIMIT 50`;

        const result = await pool.query(query, params);

        res.status(200).json({ drivers: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
