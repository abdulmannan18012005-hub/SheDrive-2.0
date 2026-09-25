import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/profile/me
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const result = await pool.query('SELECT id, email, name, phone, avatar_url, push_notifications_enabled, sound_enabled, ride_updates_enabled FROM users WHERE id = $1', [userId]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        
        res.status(200).json({ user: result.rows[0], emergencyContactsCount: 0 }); // Mock emergency contacts count for now
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/v1/profile/me
router.put('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { name, phone, avatar_url } = req.body;
        
        const result = await pool.query(
            'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), avatar_url = COALESCE($3, avatar_url) WHERE id = $4 RETURNING id, email, name, phone, avatar_url',
            [name, phone, avatar_url, userId]
        );
        
        res.status(200).json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/v1/profile/settings
router.put('/settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { push_notifications_enabled, sound_enabled, ride_updates_enabled } = req.body;
        
        const result = await pool.query(
            'UPDATE users SET push_notifications_enabled = COALESCE($1, push_notifications_enabled), sound_enabled = COALESCE($2, sound_enabled), ride_updates_enabled = COALESCE($3, ride_updates_enabled) WHERE id = $4 RETURNING id, push_notifications_enabled, sound_enabled, ride_updates_enabled',
            [push_notifications_enabled, sound_enabled, ride_updates_enabled, userId]
        );
        
        res.status(200).json({ settings: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
