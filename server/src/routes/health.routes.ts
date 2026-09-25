import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../config/db';

const router = Router();

router.get('/health', async (req: Request, res: Response): Promise<void> => {
    const isDbConnected = await checkDbConnection();
    if (isDbConnected) {
        res.status(200).json({
            status: 'OK',
            db: 'connected',
            uptime: process.uptime()
        });
    } else {
        res.status(503).json({
            status: 'ERROR',
            db: 'disconnected',
            uptime: process.uptime()
        });
    }
});

export default router;
