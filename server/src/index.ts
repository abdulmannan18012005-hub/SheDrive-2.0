import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import { authenticateToken } from './middleware/auth.middleware';

const app = express();

// Secure HTTP middleware pipeline
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting for auth
const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authLimiter);

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
