import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

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

export default router;
