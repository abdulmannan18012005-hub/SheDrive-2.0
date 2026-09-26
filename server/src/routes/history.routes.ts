import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/rides/history
router.get('/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        
        let { page = '1', limit = '10', status = 'completed', startDate, endDate, timeSlot, searchQuery } = req.query;
        
        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 10;
        const offset = (pageNum - 1) * limitNum;

        // Build base query
        let queryStr = `
            SELECT r.*, 
                   c.id as counterparty_id, c.name as counterparty_name, c.avatar_url as counterparty_avatar,
                   d.rating as driver_rating,
                   d2.vehicle_make, d2.vehicle_model, d2.vehicle_plate,
                   rt.rating as user_rating, rt.tags as user_tags
            FROM rides r
            LEFT JOIN users c ON c.id = CASE WHEN r.passenger_id = $1 THEN r.driver_id ELSE r.passenger_id END
            LEFT JOIN drivers d ON d.driver_id = CASE WHEN r.passenger_id = $1 THEN r.driver_id ELSE r.passenger_id END
            LEFT JOIN drivers d2 ON d2.driver_id = r.driver_id
            LEFT JOIN ratings rt ON rt.ride_id = r.ride_id AND rt.rater_id = $1
            WHERE (r.passenger_id = $1 OR r.driver_id = $1)
        `;
        const params: any[] = [callerId];
        let paramIdx = 2;

        if (status && status !== 'all') {
            queryStr += ` AND r.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }

        if (startDate) {
            const startTs = new Date(startDate as string).getTime();
            queryStr += ` AND r.created_at >= $${paramIdx}`;
            params.push(startTs);
            paramIdx++;
        }

        if (endDate) {
            const endTs = new Date(endDate as string).getTime();
            queryStr += ` AND r.created_at <= $${paramIdx}`;
            params.push(endTs);
            paramIdx++;
        }

        if (timeSlot) {
            // morning: 06-11, afternoon: 12-16, evening: 17-20, night: 21-05
            // EXTRACT(HOUR FROM to_timestamp(r.created_at / 1000.0) AT TIME ZONE 'Asia/Karachi')
            const hourExpr = `EXTRACT(HOUR FROM to_timestamp(r.created_at / 1000.0) AT TIME ZONE 'Asia/Karachi')`;
            if (timeSlot === 'morning') {
                queryStr += ` AND ${hourExpr} BETWEEN 6 AND 11`;
            } else if (timeSlot === 'afternoon') {
                queryStr += ` AND ${hourExpr} BETWEEN 12 AND 16`;
            } else if (timeSlot === 'evening') {
                queryStr += ` AND ${hourExpr} BETWEEN 17 AND 20`;
            } else if (timeSlot === 'night') {
                queryStr += ` AND (${hourExpr} >= 21 OR ${hourExpr} <= 5)`;
            }
        }

        if (searchQuery) {
            queryStr += ` AND (
                c.name ILIKE $${paramIdx} OR
                r.pickup_label ILIKE $${paramIdx} OR
                r.dropoff_label ILIKE $${paramIdx} OR
                d2.vehicle_plate ILIKE $${paramIdx}
            )`;
            params.push(`%${searchQuery}%`);
            paramIdx++;
        }

        // Count total for pagination
        const countQueryStr = `SELECT COUNT(*) as total FROM (${queryStr}) as filtered_rides`;
        const countRes = await pool.query(countQueryStr, params);
        const total = parseInt(countRes.rows[0].total, 10);

        // Add order and pagination
        queryStr += ` ORDER BY r.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limitNum, offset);

        const ridesRes = await pool.query(queryStr, params);

        const mappedRides = ridesRes.rows.map(row => ({
            id: row.ride_id,
            status: row.status,
            pickup_address: row.pickup_label,
            dropoff_address: row.dropoff_label,
            category: row.vehicle_category,
            final_fare: parseFloat(row.final_fare || row.estimated_fare || '0'),
            created_at: new Date(parseInt(row.created_at)).toISOString(),
            completed_at: row.updated_at ? new Date(parseInt(row.updated_at)).toISOString() : null,
            counterparty: {
                id: row.counterparty_id,
                name: row.counterparty_name,
                avatar_url: row.counterparty_avatar || null,
                rating: row.driver_rating ? parseFloat(row.driver_rating) : 5.0
            },
            vehicle: row.vehicle_make ? {
                make: row.vehicle_make,
                model: row.vehicle_model,
                plate_number: row.vehicle_plate
            } : null,
            user_rating: row.user_rating ? {
                rating: row.user_rating,
                tags: row.user_tags || []
            } : null
        }));

        res.json({
            rides: mappedRides,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('History Query Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/:id/summary
router.get('/:id/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { id } = req.params;

        const rideRes = await pool.query(`
            SELECT r.*,
                   p.name as passenger_name, p.avatar_url as passenger_avatar,
                   d.name as driver_name, d.avatar_url as driver_avatar,
                   drv.vehicle_make, drv.vehicle_model, drv.vehicle_plate, drv.rating as driver_rating,
                   pt.amount as paid_amount, pt.payment_method
            FROM rides r
            LEFT JOIN users p ON p.id = r.passenger_id
            LEFT JOIN users d ON d.id = r.driver_id
            LEFT JOIN drivers drv ON drv.driver_id = r.driver_id
            LEFT JOIN payment_transactions pt ON pt.ride_id = r.ride_id AND pt.status = 'success'
            WHERE r.ride_id = $1
        `, [id]);

        if (rideRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = rideRes.rows[0];

        if (ride.passenger_id !== callerId && ride.driver_id !== callerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Get ratings for this ride
        const ratingsRes = await pool.query(`SELECT * FROM ratings WHERE ride_id = $1`, [id]);
        
        let passengerRating = null;
        let driverRatingGiven = null;
        for (const row of ratingsRes.rows) {
            if (row.rater_role === 'passenger') {
                passengerRating = { rating: row.rating, tags: row.tags || [] };
            } else if (row.rater_role === 'driver') {
                driverRatingGiven = { rating: row.rating, tags: row.tags || [] };
            }
        }

        const isPassenger = callerId === ride.passenger_id;

        res.json({
            id: ride.ride_id,
            status: ride.status,
            date: new Date(parseInt(ride.created_at)).toISOString(),
            timestamps: {
                created_at: new Date(parseInt(ride.created_at)).toISOString(),
                completed_at: ride.updated_at ? new Date(parseInt(ride.updated_at)).toISOString() : null
            },
            route: {
                pickup_address: ride.pickup_label,
                dropoff_address: ride.dropoff_label
            },
            distance_km: ride.distance_km || 0,
            duration_min: ride.duration_min || 0,
            fare_breakdown: {
                base_fare: parseFloat(ride.final_fare || ride.estimated_fare || '0'),
                distance_fare: 0,
                discount: 0,
                total_paid: ride.paid_amount ? parseFloat(ride.paid_amount) : parseFloat(ride.final_fare || ride.estimated_fare || '0')
            },
            counterparty: {
                id: isPassenger ? ride.driver_id : ride.passenger_id,
                name: isPassenger ? ride.driver_name : ride.passenger_name,
                avatar_url: isPassenger ? ride.driver_avatar : ride.passenger_avatar,
                rating: isPassenger ? (parseFloat(ride.driver_rating) || 5.0) : 5.0,
                role: isPassenger ? 'driver' : 'passenger'
            },
            ratings: {
                given: isPassenger ? passengerRating : driverRatingGiven,
                received: isPassenger ? driverRatingGiven : passengerRating
            }
        });

    } catch (error) {
        console.error('Ride Summary Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
