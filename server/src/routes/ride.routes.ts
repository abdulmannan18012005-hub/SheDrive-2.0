import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// DB Setup: Relax the status constraint and create ride_stops
pool.query(`
    DO $$ 
    DECLARE r RECORD; 
    BEGIN 
      FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'rides'::regclass AND contype = 'c') 
      LOOP 
        EXECUTE 'ALTER TABLE rides DROP CONSTRAINT ' || r.conname; 
      END LOOP; 
    END $$;

    CREATE TABLE IF NOT EXISTS ride_stops (
        id VARCHAR(64) PRIMARY KEY,
        ride_id VARCHAR(64) NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
        stop_order INTEGER NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        address TEXT NOT NULL,
        created_at BIGINT NOT NULL
    );

    DROP TABLE IF EXISTS bids CASCADE;
    CREATE TABLE bids (
        id VARCHAR(64) PRIMARY KEY,
        ride_id VARCHAR(64) NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
        driver_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        offered_fare NUMERIC NOT NULL,
        counter_fare NUMERIC,
        status VARCHAR(20) DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
    );
`).catch(console.error);

const PRICES = {
    bike_scooty: { base: 120, perKm: 35 },
    mini: { base: 180, perKm: 50 },
    car_ac: { base: 250, perKm: 65 },
    comfort_ac: { base: 320, perKm: 80 },
    family_xl: { base: 450, perKm: 110 }
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// POST /api/v1/rides/estimate
router.post('/estimate', async (req: Request, res: Response): Promise<void> => {
    try {
        const { pickup, dropoff, stops = [] } = req.body;
        if (!pickup || !dropoff) {
            res.status(400).json({ error: 'Pickup and dropoff are required' });
            return;
        }

        // We will calculate a simple Haversine total distance with 1.25 urban multiplier
        let totalDirectDistance = 0;
        let lastPoint = pickup;
        
        for (const stop of stops) {
            totalDirectDistance += haversineDistance(lastPoint.lat, lastPoint.lng, stop.lat, stop.lng);
            lastPoint = stop;
        }
        totalDirectDistance += haversineDistance(lastPoint.lat, lastPoint.lng, dropoff.lat, dropoff.lng);
        
        const distance_km = totalDirectDistance * 1.25;
        const duration_mins = Math.round(distance_km * 3); // Approx 20km/h average urban speed

        const estimates = {
            bike_scooty: Math.round(PRICES.bike_scooty.base + PRICES.bike_scooty.perKm * distance_km),
            mini: Math.round(PRICES.mini.base + PRICES.mini.perKm * distance_km),
            car_ac: Math.round(PRICES.car_ac.base + PRICES.car_ac.perKm * distance_km),
            comfort_ac: Math.round(PRICES.comfort_ac.base + PRICES.comfort_ac.perKm * distance_km),
            family_xl: Math.round(PRICES.family_xl.base + PRICES.family_xl.perKm * distance_km),
        };

        const polyline = "mock_encoded_polyline_for_fallback";

        res.status(200).json({ distance_km, duration_mins, polyline, estimates });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/rides/request
router.post('/request', authenticateToken, requireRole('passenger'), async (req: Request, res: Response): Promise<void> => {
    try {
        const passengerId = (req as any).user.id;
        const { pickup, dropoff, stops = [], category, offered_fare, payment_method = 'cash' } = req.body;
        
        if (!pickup || !dropoff || !category || !offered_fare) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const rideId = `ride-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const now = Date.now();

        await pool.query('BEGIN');

        await pool.query(
            `INSERT INTO rides (
                ride_id, passenger_id, status, vehicle_category, 
                pickup_lat, pickup_lng, pickup_label,
                dropoff_lat, dropoff_lng, dropoff_label,
                distance_km, duration_min, estimated_fare, offered_fare,
                payment_method, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
                rideId, passengerId, 'searching', category,
                pickup.lat, pickup.lng, pickup.address || 'Pickup',
                dropoff.lat, dropoff.lng, dropoff.address || 'Dropoff',
                10, 30, offered_fare, offered_fare, // Mock distance/duration for now
                payment_method, now, now
            ]
        );

        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            const stopId = `stop-${Date.now()}-${i}`;
            await pool.query(
                `INSERT INTO ride_stops (id, ride_id, stop_order, lat, lng, address, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [stopId, rideId, i, stop.lat, stop.lng, stop.address || 'Stop', now]
            );
        }

        await pool.query('COMMIT');

        const rideRecord = await pool.query('SELECT * FROM rides WHERE ride_id = $1', [rideId]);
        res.status(201).json({ ride: rideRecord.rows[0] });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const rideRes = await pool.query('SELECT * FROM rides WHERE ride_id = $1', [id]);
        if (rideRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const stopsRes = await pool.query('SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC', [id]);
        const ride = rideRes.rows[0];
        ride.stops = stopsRes.rows;

        res.status(200).json({ ride });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/rides/:id/cancel
router.post('/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const passengerId = (req as any).user.id;

        const checkRes = await pool.query('SELECT status, passenger_id FROM rides WHERE ride_id = $1', [id]);
        if (checkRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = checkRes.rows[0];
        if (ride.passenger_id !== passengerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        if (ride.status !== 'searching' && ride.status !== 'offering' && ride.status !== 'requested' && ride.status !== 'negotiating') {
            res.status(400).json({ error: 'Ride cannot be cancelled at this stage' });
            return;
        }

        await pool.query('UPDATE rides SET status = $1, updated_at = $2 WHERE ride_id = $3', ['cancelled', Date.now(), id]);
        res.status(200).json({ success: true, message: 'Ride cancelled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/:id/bids
router.get('/:id/bids', authenticateToken, requireRole('passenger'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const now = Date.now();

        // Auto-cleanup conceptually (we can just filter out expired in the SELECT)
        // Optionally flag them expired in DB if we want to be thorough:
        await pool.query("UPDATE bids SET status = 'expired' WHERE ride_id = $1 AND status = 'pending' AND expires_at < $2", [id, now]);

        const bidsRes = await pool.query(`
            SELECT b.id AS bid_id, b.driver_id, u.name AS driver_name, 
                   d.rating, d.total_rides, d.vehicle_make, d.vehicle_model, 
                   d.vehicle_color, d.vehicle_plate, d.vehicle_category, d.vehicle_photo_url,
                   b.offered_fare, b.expires_at
            FROM bids b
            JOIN drivers d ON b.driver_id = d.driver_id
            JOIN users u ON u.id = d.driver_id
            WHERE b.ride_id = $1 AND b.status = 'pending' AND b.expires_at > $2
        `, [id, now]);

        const mappedBids = bidsRes.rows.map(r => ({
            bid_id: r.bid_id,
            driver_id: r.driver_id,
            driver_name: r.driver_name,
            rating: r.rating,
            total_rides: r.total_rides,
            vehicle: {
                make: r.vehicle_make,
                model: r.vehicle_model,
                color: r.vehicle_color,
                plate: r.vehicle_plate,
                category: r.vehicle_category,
                photo_url: r.vehicle_photo_url
            },
            offered_fare: Number(r.offered_fare),
            expires_in_seconds: Math.max(0, Math.floor((Number(r.expires_at) - now) / 1000))
        }));

        res.status(200).json({ bids: mappedBids });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/rides/:id/bids/:bidId/accept
router.post('/:id/bids/:bidId/accept', authenticateToken, requireRole('passenger'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, bidId } = req.params;
        const passengerId = (req as any).user.id;
        
        await pool.query('BEGIN');
        
        // 1. Verify ride status
        const rideRes = await pool.query('SELECT status, passenger_id FROM rides WHERE ride_id = $1 FOR UPDATE', [id]);
        if (rideRes.rowCount === 0) {
            await pool.query('ROLLBACK');
            res.status(404).json({ error: 'Ride not found' });
            return;
        }
        if (rideRes.rows[0].passenger_id !== passengerId) {
            await pool.query('ROLLBACK');
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (rideRes.rows[0].status !== 'searching' && rideRes.rows[0].status !== 'requested') {
            await pool.query('ROLLBACK');
            res.status(400).json({ error: 'Ride is no longer searching for drivers' });
            return;
        }

        // 2. Verify bid status
        const bidRes = await pool.query('SELECT status, driver_id, offered_fare FROM bids WHERE id = $1 AND ride_id = $2 FOR UPDATE', [bidId, id]);
        if (bidRes.rowCount === 0) {
            await pool.query('ROLLBACK');
            res.status(404).json({ error: 'Bid not found' });
            return;
        }
        if (bidRes.rows[0].status !== 'pending') {
            await pool.query('ROLLBACK');
            res.status(400).json({ error: 'Bid is no longer active or pending' });
            return;
        }
        
        const bid = bidRes.rows[0];

        // 3. Update ride
        await pool.query(
            'UPDATE rides SET status = $1, driver_id = $2, final_fare = $3, updated_at = $4 WHERE ride_id = $5',
            ['accepted', bid.driver_id, bid.offered_fare, Date.now(), id]
        );

        // 4. Update bids
        await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', bidId]);
        await pool.query("UPDATE bids SET status = 'declined' WHERE ride_id = $1 AND id != $2 AND status = 'pending'", [id, bidId]);

        await pool.query('COMMIT');
        
        const updatedRideRes = await pool.query('SELECT * FROM rides WHERE ride_id = $1', [id]);
        res.status(200).json({ success: true, ride: updatedRideRes.rows[0] });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/rides/:id/bids/:bidId/decline
router.post('/:id/bids/:bidId/decline', authenticateToken, requireRole('passenger'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, bidId } = req.params;
        const passengerId = (req as any).user.id;
        
        const rideRes = await pool.query('SELECT passenger_id FROM rides WHERE ride_id = $1', [id]);
        if (rideRes.rowCount === 0 || rideRes.rows[0].passenger_id !== passengerId) {
            res.status(403).json({ error: 'Forbidden or Ride not found' });
            return;
        }

        await pool.query("UPDATE bids SET status = 'declined' WHERE id = $1 AND ride_id = $2 AND status = 'pending'", [bidId, id]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
