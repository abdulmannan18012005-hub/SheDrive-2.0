import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Auto-migrate ratings table
pool.query(`
    DROP TABLE IF EXISTS ratings CASCADE;
    CREATE TABLE ratings (
        id VARCHAR(64) PRIMARY KEY,
        ride_id VARCHAR(64) NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
        rater_id VARCHAR(64) NOT NULL REFERENCES users(id),
        rated_id VARCHAR(64) NOT NULL REFERENCES users(id),
        rater_role VARCHAR(20) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        tags TEXT[] DEFAULT '{}',
        comment TEXT,
        created_at BIGINT NOT NULL,
        CONSTRAINT unique_ride_rater UNIQUE (ride_id, rater_id)
    );
`).catch(console.error);

// POST /api/v1/rides/:id/rating
router.post('/:id/rating', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { rating, tags = [], comment } = req.body;
    const callerId = (req as any).user.id;
    const callerRole = (req as any).user.role; // passenger or driver

    if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify ride
        const rideRes = await client.query('SELECT * FROM rides WHERE ride_id = $1', [id]);
        if ((rideRes.rowCount || 0) === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = rideRes.rows[0];
        // Validate caller is a participant
        if (ride.passenger_id !== callerId && ride.driver_id !== callerId) {
            await client.query('ROLLBACK');
            res.status(403).json({ error: 'Not authorized to rate this ride' });
            return;
        }
        
        // Determine target
        const ratedId = callerId === ride.passenger_id ? ride.driver_id : ride.passenger_id;

        // Prevent duplicate rating
        const dupCheck = await client.query(
            'SELECT id FROM ratings WHERE ride_id = $1 AND rater_id = $2',
            [id, callerId]
        );
        if ((dupCheck.rowCount || 0) > 0) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'You have already rated this ride' });
            return;
        }

        const ratingId = `rating-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const now = Date.now();

        await client.query(`
            INSERT INTO ratings (id, ride_id, rater_id, rated_id, rater_role, rating, tags, comment, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [ratingId, id, callerId, ratedId, callerRole, rating, tags, comment, now]);

        // If target is a driver, update drivers.rating
        if (callerId === ride.passenger_id) { // passenger rating a driver
            const avgRes = await client.query(
                'SELECT AVG(rating)::NUMERIC(3,2) as avg_rating FROM ratings WHERE rated_id = $1 AND rater_role = $2',
                [ratedId, 'passenger']
            );
            const newAvg = parseFloat(avgRes.rows[0].avg_rating || rating);
            
            await client.query('UPDATE drivers SET rating = $1 WHERE driver_id = $2', [newAvg, ratedId]);
        }
        // Could do passenger rating update here if passengers had a rating column, but requirements only specify driver

        await client.query('COMMIT');
        res.status(201).json({
            id: ratingId,
            message: 'Rating submitted successfully'
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Rating submission error:', err);
        // Handle constraint violations explicitly if we want
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

// GET /api/v1/rides/:id/ratings
router.get('/:id/ratings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const ratingsRes = await pool.query('SELECT * FROM ratings WHERE ride_id = $1', [id]);
        res.json(ratingsRes.rows);
    } catch (err) {
        console.error('Get ratings error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
