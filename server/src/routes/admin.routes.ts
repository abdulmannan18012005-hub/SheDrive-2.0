import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { logAudit } from '../services/audit.service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

// POST /api/v1/admin/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password required' });
            return;
        }

        const userRes = await pool.query('SELECT id, password_hash, role FROM users WHERE email = $1 AND role = $2', [email, 'admin']);
        if (userRes.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const user = userRes.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
        res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/admin/dashboard/stats
router.get('/dashboard/stats', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const stats = {
            total_drivers: 0,
            pending_verifications: 0,
            active_passengers: 0,
            completed_rides: 0
        };

        const drivers = await pool.query(`SELECT COUNT(*) FROM drivers`);
        stats.total_drivers = parseInt(drivers.rows[0].count, 10);

        const pending = await pool.query(`SELECT COUNT(*) FROM drivers WHERE vehicle_review_status = 'pending'`);
        stats.pending_verifications = parseInt(pending.rows[0].count, 10);

        const passengers = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'passenger'`);
        stats.active_passengers = parseInt(passengers.rows[0].count, 10);

        res.status(200).json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/admin/drivers/pending
router.get('/drivers/pending', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const pending = await pool.query(`
            SELECT d.driver_id, d.vehicle_make, d.vehicle_model, d.vehicle_category, d.vehicle_review_status, u.name, u.email, d.vehicle_review_submitted_at
            FROM drivers d
            JOIN users u ON u.id = d.driver_id
            WHERE d.vehicle_review_status = 'pending' OR u.is_verified = false
        `);
        res.status(200).json({ drivers: pending.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/admin/drivers/:id
router.get('/drivers/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const driverRes = await pool.query(`
            SELECT d.*, u.name, u.email, u.phone, u.cnic, u.is_verified
            FROM drivers d
            JOIN users u ON u.id = d.driver_id
            WHERE d.driver_id = $1
        `, [id]);
        
        if (driverRes.rows.length === 0) {
            res.status(404).json({ error: 'Driver not found' });
            return;
        }

        res.status(200).json({ driver: driverRes.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/admin/drivers/:id/verify
router.post('/drivers/:id/verify', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user.id;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (status !== 'approved' && status !== 'rejected') {
            res.status(400).json({ error: 'Status must be approved or rejected' });
            return;
        }

        if (status === 'rejected' && !rejection_reason) {
            res.status(400).json({ error: 'Rejection reason is required' });
            return;
        }

        await pool.query('BEGIN');

        if (status === 'approved') {
            await pool.query(`UPDATE drivers SET vehicle_review_status = 'approved', vehicle_review_notes = null WHERE driver_id = $1`, [id]);
            await pool.query(`UPDATE users SET is_verified = true WHERE id = $1`, [id]);
        } else {
            await pool.query(`UPDATE drivers SET vehicle_review_status = 'rejected', vehicle_review_notes = $2 WHERE driver_id = $1`, [id, rejection_reason]);
            await pool.query(`UPDATE users SET is_verified = false WHERE id = $1`, [id]);
        }

        await logAudit(
            adminId,
            status === 'approved' ? 'APPROVE_DRIVER' : 'REJECT_DRIVER',
            'drivers',
            id as string,
            status === 'approved' ? 'Driver approved successfully' : `Driver rejected: ${rejection_reason}`,
            ipAddress
        );

        await pool.query('COMMIT');
        res.status(200).json({ message: `Driver ${status} successfully` });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = '1', limit = '10' } = req.query;
        const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
        
        const logs = await pool.query(`
            SELECT a.*, u.email as admin_email 
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.timestamp DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        res.status(200).json({ logs: logs.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
