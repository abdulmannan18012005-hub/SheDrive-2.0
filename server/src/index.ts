import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import placesRoutes from './routes/places.routes';
import feedbackRoutes from './routes/feedback.routes';
import driverRoutes from './routes/driver.routes';
import adminRoutes from './routes/admin.routes';
import telemetryRoutes from './routes/telemetry.routes';
import rideRoutes from './routes/ride.routes';
import emergencyRoutes from './routes/emergency.routes';
import ratingRoutes from './routes/rating.routes';
import historyRoutes from './routes/history.routes';
import exportRoutes from './routes/export.routes';
import receiptRoutes from './routes/receipt.routes';
import publicProfileRoutes from './routes/public-profile.routes';
import chatRoutes from './routes/chat.routes';
import { authenticateToken } from './middleware/auth.middleware';

const app = express();

// Secure HTTP middleware pipeline
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173', // Admin portal local dev
            'http://localhost:3000', // Web local dev
            'https://shedrive.onrender.com' // Production domain
        ];
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json({ limit: '10mb' })); // Increased for base64 doc uploads

// Rate limiting for auth
const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests from this IP to sensitive routes' }
});

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/places', sensitiveLimiter, placesRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/profiles', publicProfileRoutes);
app.use('/api/v1/rides/public-track', sensitiveLimiter); // Protect public tracking
app.use('/api/v1/rides', historyRoutes);
app.use('/api/v1/rides', exportRoutes);
app.use('/api/v1/rides', receiptRoutes);
app.use('/api/v1/rides', chatRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/rides', ratingRoutes);
app.use('/api/v1/emergency', sensitiveLimiter, emergencyRoutes);

// Dummy protected route for testing
app.get('/api/v1/protected', authenticateToken, (req, res) => {
    res.json({ data: 'secret' });
});

// Global standard response formatter / centralized error-handling
app.use(errorHandler);

import { pool } from './config/db';

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received. Closing HTTP server...`);
        server.close(async () => {
            console.log('HTTP server closed.');
            try {
                console.log('Closing database connection pool...');
                await pool.end();
                console.log('Database pool closed. Exiting process gracefully.');
                process.exit(0);
            } catch (err) {
                console.error('Error during shutdown:', err);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
