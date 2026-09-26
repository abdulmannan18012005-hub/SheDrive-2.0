import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/rides/:id/receipt
router.get('/:id/receipt', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const callerId = (req as any).user.id;
        const { id } = req.params;
        const { format } = req.query;

        const rideRes = await pool.query(`
            SELECT r.*,
                   p.name as passenger_name,
                   d.name as driver_name,
                   drv.vehicle_make, drv.vehicle_model, drv.vehicle_plate, drv.rating as driver_rating,
                   pt.amount as paid_amount, pt.payment_method
            FROM rides r
            LEFT JOIN users p ON p.id = r.passenger_id
            LEFT JOIN users d ON d.id = r.driver_id
            LEFT JOIN drivers drv ON drv.driver_id = r.driver_id
            LEFT JOIN payment_transactions pt ON pt.ride_id = r.ride_id AND pt.status = 'success'
            WHERE r.ride_id = $1
        `, [id]);

        if (rideRes.rowCount === 0) {
            res.status(404).json({ error: 'Ride not found' });
            return;
        }

        const ride = rideRes.rows[0];

        if (ride.passenger_id !== callerId && ride.driver_id !== callerId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const isPassenger = callerId === ride.passenger_id;
        const totalFare = parseFloat(ride.paid_amount || ride.final_fare || ride.estimated_fare || '0');
        const paymentMethod = ride.payment_method || 'Cash';

        const receiptData = {
            header: 'SheDrive 2.0 Official Receipt',
            receipt_number: `SHD-RC-${ride.ride_id.substring(0, 6).toUpperCase()}`,
            metadata: {
                start_time: new Date(parseInt(ride.created_at)).toISOString(),
                completion_time: ride.updated_at ? new Date(parseInt(ride.updated_at)).toISOString() : null,
                category: ride.vehicle_category,
                vehicle: ride.vehicle_make ? `${ride.vehicle_make} ${ride.vehicle_model} (${ride.vehicle_plate})` : 'Unknown'
            },
            fare_breakdown: {
                base_fare: totalFare,
                distance_fare: 0,
                discount: 0,
                total_paid: totalFare,
                payment_mode: paymentMethod
            },
            route_details: {
                pickup_address: ride.pickup_label,
                dropoff_address: ride.dropoff_label,
                distance_km: ride.distance_km || 0,
                duration_min: ride.duration_min || 0
            },
            counterparty: {
                name: isPassenger ? ride.driver_name : ride.passenger_name,
                baseline_rating: isPassenger ? (parseFloat(ride.driver_rating) || 5.0) : 5.0
            }
        };

        if (format === 'html') {
            const html = `
                <html>
                    <head><style>body { font-family: sans-serif; padding: 20px; }</style></head>
                    <body>
                        <h1>${receiptData.header}</h1>
                        <p><strong>Receipt No:</strong> ${receiptData.receipt_number}</p>
                        <hr/>
                        <p><strong>Route:</strong> ${receiptData.route_details.pickup_address} -> ${receiptData.route_details.dropoff_address}</p>
                        <p><strong>Vehicle:</strong> ${receiptData.metadata.vehicle}</p>
                        <p><strong>Total Fare:</strong> PKR ${receiptData.fare_breakdown.total_paid} (${receiptData.fare_breakdown.payment_mode})</p>
                    </body>
                </html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } else {
            res.json(receiptData);
        }

    } catch (error) {
        console.error('Receipt Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
