import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Auto-migrate emergency schema
pool.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        relationship VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        created_at BIGINT NOT NULL
    );
    ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
`).catch(console.error);

// GET /api/v1/emergency/contacts
router.get('/contacts', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const result = await pool.query('SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json({ contacts: result.rows });
    } catch (err) {
        console.error('Fetch emergency contacts err:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/emergency/contacts
router.post('/contacts', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { name, phone, relationship, is_primary = false } = req.body;

        if (!name || !phone) {
            res.status(400).json({ error: 'Name and phone are required' });
            return;
        }

        const countRes = await pool.query('SELECT COUNT(*) FROM emergency_contacts WHERE user_id = $1', [userId]);
        const count = parseInt(countRes.rows[0].count, 10);

        if (count >= 5) {
            res.status(400).json({ error: 'Maximum 5 contacts allowed' });
            return;
        }

        if (is_primary) {
            await pool.query('UPDATE emergency_contacts SET is_primary = false WHERE user_id = $1', [userId]);
        }

        const contactId = `ec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const now = Date.now();

        const insertRes = await pool.query(
            `INSERT INTO emergency_contacts (id, user_id, name, phone, relationship, is_primary, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [contactId, userId, name, phone, relationship || null, is_primary, now]
        );

        res.status(201).json(insertRes.rows[0]);
    } catch (err) {
        console.error('Create emergency contact err:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/v1/emergency/contacts/:id
router.delete('/contacts/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const delRes = await pool.query('DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        if (delRes.rowCount === 0) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Delete emergency contact err:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
