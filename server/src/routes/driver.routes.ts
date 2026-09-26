import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { uploadImage } from '../services/cloudinary.service';

const router = Router();

const ALLOWED_CATEGORIES = ['bike_scooty', 'mini', 'car_ac', 'comfort_ac', 'family_xl'];

// POST /api/v1/driver/vehicle - Setup Vehicle
router.post('/vehicle', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { make, model, year, color, plate_number, category } = req.body;

        if (!ALLOWED_CATEGORIES.includes(category)) {
            res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
            return;
        }

        if (!make || !model || !year || !color || !plate_number) {
            res.status(400).json({ error: 'All vehicle fields are required' });
            return;
        }

        // Upsert driver profile (using existing driver_id which matches users.id usually)
        await pool.query(
            `INSERT INTO drivers (driver_id, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, vehicle_category, vehicle_review_status, rating, last_location_update) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 5.00, 1700000000000)
             ON CONFLICT (driver_id) DO UPDATE SET 
             vehicle_make = EXCLUDED.vehicle_make, vehicle_model = EXCLUDED.vehicle_model, 
             vehicle_year = EXCLUDED.vehicle_year, vehicle_color = EXCLUDED.vehicle_color, 
             vehicle_plate = EXCLUDED.vehicle_plate, vehicle_category = EXCLUDED.vehicle_category, 
             vehicle_review_status = 'pending'`,
            [userId, make, model, year, color, plate_number, category]
        );

        res.status(201).json({ message: 'Vehicle setup complete. Pending verification.', driverId: userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/v1/driver/documents/upload - Upload Documents
router.post('/documents/upload', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { cnic_front, cnic_back, license, registration_book, vehicle_photo } = req.body;

        const driverRes = await pool.query('SELECT driver_id FROM drivers WHERE driver_id = $1', [userId]);
        if (driverRes.rows.length === 0) {
            res.status(404).json({ error: 'Driver profile not found. Complete vehicle setup first.' });
            return;
        }

        let cnicFrontUrl = null, cnicBackUrl = null, licenseUrl = null, registrationUrl = null, vehiclePhotoUrl = null;

        if (cnic_front) cnicFrontUrl = await uploadImage(cnic_front, 'documents/cnic');
        if (cnic_back) cnicBackUrl = await uploadImage(cnic_back, 'documents/cnic');
        if (license) licenseUrl = await uploadImage(license, 'documents/license');
        if (registration_book) registrationUrl = await uploadImage(registration_book, 'documents/registration');
        if (vehicle_photo) vehiclePhotoUrl = await uploadImage(vehicle_photo, 'documents/vehicle');

        await pool.query(
            `UPDATE drivers SET 
             cnic_front_url = COALESCE($1, cnic_front_url),
             cnic_back_url = COALESCE($2, cnic_back_url),
             license_front_url = COALESCE($3, license_front_url),
             registration_url = COALESCE($4, registration_url),
             vehicle_photo_url = COALESCE($5, vehicle_photo_url),
             vehicle_review_status = 'pending'
             WHERE driver_id = $6`,
            [cnicFrontUrl, cnicBackUrl, licenseUrl, registrationUrl, vehiclePhotoUrl, userId]
        );

        res.status(200).json({ message: 'Documents uploaded successfully. Status updated to pending.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/driver/status
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        
        const result = await pool.query(
            `SELECT vehicle_review_status as status, rating, 
             cnic_front_url IS NOT NULL as cnic_uploaded, 
             license_front_url IS NOT NULL as license_uploaded,
             registration_url IS NOT NULL as registration_uploaded,
             vehicle_make as make, vehicle_model as model, vehicle_year as year, 
             vehicle_color as color, vehicle_plate as plate_number, vehicle_category as category
             FROM drivers
             WHERE driver_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        res.status(200).json({ driver: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/v1/driver/vehicle - Update Vehicle and re-trigger review
router.put('/vehicle', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const { make, model, year, color, plate_number, category } = req.body;

        if (category && !ALLOWED_CATEGORIES.includes(category)) {
            res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
            return;
        }

        const driverRes = await pool.query('SELECT driver_id FROM drivers WHERE driver_id = $1', [userId]);
        if (driverRes.rows.length === 0) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        await pool.query(
            `UPDATE drivers SET 
             vehicle_make = COALESCE($1, vehicle_make), 
             vehicle_model = COALESCE($2, vehicle_model), 
             vehicle_year = COALESCE($3, vehicle_year), 
             vehicle_color = COALESCE($4, vehicle_color), 
             vehicle_plate = COALESCE($5, vehicle_plate), 
             vehicle_category = COALESCE($6, vehicle_category),
             vehicle_review_status = 'pending'
             WHERE driver_id = $7`,
            [make, model, year, color, plate_number, category, userId]
        );

        res.status(200).json({ message: 'Vehicle updated. Status changed to pending.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/driver/earnings/summary
router.get('/earnings/summary', authenticateToken, requireRole('driver'), async (req: Request, res: Response): Promise<void> => {
    const driverId = (req as any).user.id;
    const now = new Date();
    
    // Get start of today, week, month
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    try {
        const txRes = await pool.query(`
            SELECT amount, created_at 
            FROM payment_transactions 
            WHERE payee_id = $1 AND status = 'success'
        `, [driverId]);

        let todayEarnings = 0;
        let todayTrips = 0;
        let weekEarnings = 0;
        let monthEarnings = 0;

        for (const tx of txRes.rows) {
            const amount = parseFloat(tx.amount);
            const ts = parseInt(tx.created_at, 10);
            
            if (ts >= startOfToday) {
                todayEarnings += amount;
                todayTrips++;
            }
            if (ts >= startOfWeek) {
                weekEarnings += amount;
            }
            if (ts >= startOfMonth) {
                monthEarnings += amount;
            }
        }

        res.json({
            today_earnings: todayEarnings,
            today_trips: todayTrips,
            week_earnings: weekEarnings,
            month_earnings: monthEarnings
        });
    } catch (err) {
        console.error('Earnings summary error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/v1/driver/monthly-account
router.get('/monthly-account', authenticateToken, requireRole('driver'), async (req: Request, res: Response): Promise<void> => {
    const driverId = (req as any).user.id;
    const now = new Date();
    // format YYYY-MM
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        // Find existing or create placeholder response
        let subRes = await pool.query(
            "SELECT * FROM driver_subscriptions WHERE driver_id = $1 AND billing_month = $2",
            [driverId, billingMonth]
        );

        if (subRes.rowCount === 0) {
            // Lazy initialization of subscription
            const subId = `sub-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            const ts = Date.now();
            await pool.query(
                "INSERT INTO driver_subscriptions (id, driver_id, billing_month, base_fee, status, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
                [subId, driverId, billingMonth, 1000.00, 'unpaid', ts]
            );
            subRes = await pool.query(
                "SELECT * FROM driver_subscriptions WHERE driver_id = $1 AND billing_month = $2",
                [driverId, billingMonth]
            );
        }

        const sub = subRes.rows[0];
        res.json({
            billing_month: sub.billing_month,
            status: sub.status,
            base_fee: parseFloat(sub.base_fee),
            due_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`, // 5th of next month roughly
            paid_at: sub.paid_at
        });
    } catch (err) {
        console.error('Monthly account error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
