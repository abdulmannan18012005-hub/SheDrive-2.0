import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/rides/export/csv
router.get('/export/csv', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { startDate, endDate, status } = req.query;

        let queryStr = `
            SELECT r.*,
                   pt.payment_method,
                   pt.amount as paid_amount
            FROM rides r
            LEFT JOIN payment_transactions pt ON pt.ride_id = r.ride_id AND pt.status = 'success'
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
            queryStr += ` AND r.created_at >= $${paramIdx}`;
            params.push(new Date(startDate as string).getTime());
            paramIdx++;
        }

        if (endDate) {
            queryStr += ` AND r.created_at <= $${paramIdx}`;
            params.push(new Date(endDate as string).getTime());
            paramIdx++;
        }

        queryStr += ` ORDER BY r.created_at DESC`;

        const { rows } = await pool.query(queryStr, params);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shedrive-trips-export.csv"');

        // CSV Header: Trip ID,Date,Status,Category,Pickup Location,Dropoff Location,Distance (km),Duration (min),Fare (PKR),Payment Method
        res.write('Trip ID,Date,Status,Category,Pickup Location,Dropoff Location,Distance (km),Duration (min),Fare (PKR),Payment Method\n');

        const escapeCSV = (field: any) => {
            if (field === null || field === undefined) return '';
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        for (const row of rows) {
            const dateStr = new Date(parseInt(row.created_at)).toISOString();
            const fare = parseFloat(row.paid_amount || row.final_fare || row.estimated_fare || '0');
            const paymentMethod = row.payment_method || 'cash';
            
            const line = [
                row.ride_id,
                dateStr,
                row.status,
                row.vehicle_category,
                row.pickup_label,
                row.dropoff_label,
                row.distance_km || 0,
                row.duration_min || 0,
                fare,
                paymentMethod
            ].map(escapeCSV).join(',');
            
            res.write(line + '\n');
        }

        res.end();
    } catch (error) {
        console.error('CSV Export Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/rides/export/summary
router.get('/export/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        
        const summaryRes = await pool.query(`
            SELECT COUNT(*) as total_trips,
                   SUM(CAST(COALESCE(r.final_fare, r.estimated_fare, '0') AS numeric)) as total_spent,
                   AVG(CAST(COALESCE(r.final_fare, r.estimated_fare, '0') AS numeric)) as avg_fare
            FROM rides r
            WHERE (r.passenger_id = $1 OR r.driver_id = $1) AND r.status = 'completed'
        `, [callerId]);

        const total_trips = parseInt(summaryRes.rows[0].total_trips || '0', 10);
        const total_spent = parseFloat(summaryRes.rows[0].total_spent || '0');
        const avg_fare = parseFloat(summaryRes.rows[0].avg_fare || '0');

        res.json({
            total_trips,
            total_spent,
            avg_fare
        });
    } catch (error) {
        console.error('Export Summary Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
