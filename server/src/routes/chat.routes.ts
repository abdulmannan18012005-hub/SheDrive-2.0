import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// POST /api/v1/rides/:id/chat/messages
router.post('/:id/chat/messages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { id: rideId } = req.params;
        const { message_text } = req.body;

        if (!message_text || typeof message_text !== 'string' || message_text.trim().length === 0) {
            res.status(400).json({ error: 'Message text is required' });
            return;
        }

        if (message_text.length > 500) {
            res.status(400).json({ error: 'Message is too long (max 500 characters)' });
            return;
        }

        const rideRes = await pool.query(`SELECT passenger_id, driver_id, status FROM rides WHERE ride_id = $1`, [rideId]);
        if (rideRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = rideRes.rows[0];
        if (ride.passenger_id !== callerId && ride.driver_id !== callerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const validStatuses = ['accepted', 'arrived', 'in_progress'];
        if (!validStatuses.includes(ride.status)) {
            res.status(400).json({ error: 'Chat is closed for completed rides' });
            return;
        }

        const recipientId = (callerId === ride.passenger_id) ? ride.driver_id : ride.passenger_id;

        const insertRes = await pool.query(`
            INSERT INTO chat_messages (id, ride_id, sender_id, recipient_id, message_text, is_read)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, false)
            RETURNING *
        `, [rideId, callerId, recipientId, message_text.trim()]);

        res.status(201).json(insertRes.rows[0]);
    } catch (error) {
        console.error('Chat Send Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/:id/chat/messages
router.get('/:id/chat/messages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { id: rideId } = req.params;
        const { after } = req.query;

        const rideRes = await pool.query(`SELECT passenger_id, driver_id FROM rides WHERE ride_id = $1`, [rideId]);
        if (rideRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = rideRes.rows[0];
        if (ride.passenger_id !== callerId && ride.driver_id !== callerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        let queryStr = `SELECT * FROM chat_messages WHERE ride_id = $1`;
        const params: any[] = [rideId];

        if (after) {
            queryStr += ` AND created_at > $2`;
            // Check if epoch or ISO string
            let afterDate = after as string;
            if (!isNaN(Number(afterDate))) {
                afterDate = new Date(Number(afterDate)).toISOString();
            }
            params.push(afterDate);
        }

        queryStr += ` ORDER BY created_at ASC`;

        const messagesRes = await pool.query(queryStr, params);

        // Mark as read
        if (messagesRes.rowCount && messagesRes.rowCount > 0) {
            const unreadMessageIds = messagesRes.rows
                .filter(m => m.recipient_id === callerId && !m.is_read)
                .map(m => m.id);

            if (unreadMessageIds.length > 0) {
                await pool.query(`
                    UPDATE chat_messages 
                    SET is_read = true 
                    WHERE id = ANY($1::uuid[])
                `, [unreadMessageIds]);
                
                // Update the memory objects so the response reflects the read status
                messagesRes.rows.forEach(m => {
                    if (unreadMessageIds.includes(m.id)) {
                        m.is_read = true;
                    }
                });
            }
        }

        res.json({ messages: messagesRes.rows });
    } catch (error) {
        console.error('Chat Fetch Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/:id/chat/unread-count
router.get('/:id/chat/unread-count', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { id: rideId } = req.params;

        const countRes = await pool.query(`
            SELECT COUNT(*) as unread_count 
            FROM chat_messages 
            WHERE ride_id = $1 AND recipient_id = $2 AND is_read = false
        `, [rideId, callerId]);

        res.json({ unread_count: parseInt(countRes.rows[0].unread_count || '0', 10) });
    } catch (error) {
        console.error('Chat Unread Count Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
