import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// POST /api/v1/feedback
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { category, message } = req.body;
        
        if (!category || !message) {
            res.status(400).json({ error: 'Category and message are required' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO app_feedback (id, user_id, category, message, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, 1700000000000, 1700000000000) RETURNING id, created_at',
            [userId, category, message]
        );
        
        res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
