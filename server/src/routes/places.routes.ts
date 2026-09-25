import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const placesRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 150, // limit each IP to 150 requests per windowMs
    message: { error: 'Too many requests, please try again later' }
});

const router = Router();

// GET /api/v1/places
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const result = await pool.query('SELECT * FROM saved_places WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json({ places: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/places
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { label, name, address, latitude, longitude } = req.body;
        
        if (!label || !latitude || !longitude) {
            res.status(400).json({ error: 'label, latitude, and longitude are required' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO saved_places (id, user_id, label, name, address, latitude, longitude, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 1700000000000, 1700000000000) RETURNING *',
            [userId, label, name, address, latitude, longitude]
        );
        
        res.status(201).json({ place: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/v1/places/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const placeId = req.params.id;
        
        const result = await pool.query('DELETE FROM saved_places WHERE id = $1 AND user_id = $2 RETURNING id', [placeId, userId]);
        
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Place not found or unauthorized' });
            return;
        }
        
        res.status(200).json({ message: 'Place deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/places/autocomplete
router.get('/autocomplete', authenticateToken, placesRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const { query, session_token } = req.query;
        if (!query) {
            res.status(400).json({ error: 'Query parameter is required' });
            return;
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey === 'placeholder' || apiKey === '') {
            // Mock Fallback
            res.status(200).json({
                predictions: [
                    { place_id: `mock_id_1_${query}`, main_text: `${query} (Mock)`, secondary_text: 'Lahore, Pakistan' },
                    { place_id: `mock_id_2_${query}`, main_text: `${query} Central`, secondary_text: 'Lahore, Pakistan' }
                ]
            });
            return;
        }

        // Real Google Places call
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query as string)}&components=country:pk&key=${apiKey}${session_token ? `&sessiontoken=${session_token}` : ''}`);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google Maps API Error:', data);
            res.status(500).json({ error: 'Places API error' });
            return;
        }

        const predictions = data.predictions.map((p: any) => ({
            place_id: p.place_id,
            main_text: p.structured_formatting.main_text,
            secondary_text: p.structured_formatting.secondary_text
        }));

        res.status(200).json({ predictions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/places/details/:placeId
router.get('/details/:placeId', authenticateToken, placesRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const { placeId } = req.params;
        const { session_token } = req.query;

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey === 'placeholder' || apiKey === '') {
            // Mock Fallback
            res.status(200).json({
                place: {
                    place_id: placeId,
                    name: 'Mock Details Location',
                    address: 'Lahore, Pakistan',
                    latitude: 31.52037,
                    longitude: 74.358747
                }
            });
            return;
        }

        // Real Google Places Details call
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId as string)}&fields=geometry,name,formatted_address&key=${apiKey}${session_token ? `&sessiontoken=${session_token}` : ''}`);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Maps API Error:', data);
            res.status(500).json({ error: 'Places API error' });
            return;
        }

        const place = {
            place_id: placeId,
            name: data.result.name,
            address: data.result.formatted_address,
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng
        };

        res.status(200).json({ place });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
