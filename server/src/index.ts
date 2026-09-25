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
import { authenticateToken } from './middleware/auth.middleware';

const app = express();

// Secure HTTP middleware pipeline
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' })); // Increased for base64 doc uploads

// Rate limiting for auth
const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/places', placesRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/emergency', emergencyRoutes);

// Dummy protected route for testing
app.get('/api/v1/protected', authenticateToken, (req, res) => {
    res.json({ data: 'secret' });
});

// Global standard response formatter / centralized error-handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
