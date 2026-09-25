import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/db';
import { sendOtpEmail } from '../services/mail.service';

const router = Router();

// 1. POST /forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Insert into DB
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                reset_token VARCHAR(255),
                expires_at TIMESTAMP NOT NULL,
                attempts INT DEFAULT 0,
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // We invalidate previous OTPs for this email by marking them used or just inserting new
        await pool.query(
            'INSERT INTO password_resets (email, code_hash, expires_at) VALUES ($1, $2, $3)',
            [email, codeHash, expiresAt]
        );

        // Send Email
        await sendOtpEmail(email, otp);

        res.status(200).json({ message: 'If the email exists, an OTP has been sent.' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. POST /verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({ error: 'Email and OTP are required' });
            return;
        }

        // Get latest OTP for email
        const result = await pool.query(
            'SELECT * FROM password_resets WHERE email = $1 AND is_used = false ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(400).json({ error: 'No active OTP found' });
            return;
        }

        const resetRecord = result.rows[0];

        // Check attempts
        if (resetRecord.attempts >= 3) {
            await pool.query('UPDATE password_resets SET is_used = true WHERE id = $1', [resetRecord.id]);
            res.status(429).json({ error: 'Too many invalid attempts. Code invalidated.' });
            return;
        }

        // Check expiry
        if (new Date() > new Date(resetRecord.expires_at)) {
            await pool.query('UPDATE password_resets SET is_used = true WHERE id = $1', [resetRecord.id]);
            res.status(400).json({ error: 'OTP has expired' });
            return;
        }

        // Verify hash
        const isValid = await bcrypt.compare(otp.toString(), resetRecord.code_hash);
        if (!isValid) {
            await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1', [resetRecord.id]);
            // If it hits 3 now, we could invalidate, but next request will catch it
            res.status(400).json({ error: 'Invalid OTP' });
            return;
        }

        // OTP is valid. Issue reset_token.
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        
        await pool.query('UPDATE password_resets SET reset_token = $1, is_used = true WHERE id = $2', [tokenHash, resetRecord.id]);

        res.status(200).json({ message: 'OTP verified', resetToken });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. POST /reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, resetToken, newPassword } = req.body;
        if (!email || !resetToken || !newPassword) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Strong password check
        if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
            res.status(400).json({ error: 'Password must be at least 8 characters and contain both letters and numbers' });
            return;
        }

        // Find the reset token
        const result = await pool.query(
            'SELECT * FROM password_resets WHERE email = $1 AND is_used = true AND reset_token IS NOT NULL ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(400).json({ error: 'Invalid reset request' });
            return;
        }

        const resetRecord = result.rows[0];
        const isValidToken = await bcrypt.compare(resetToken, resetRecord.reset_token);

        if (!isValidToken) {
            res.status(400).json({ error: 'Invalid reset token' });
            return;
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, email]
        );

        // Clear the reset token so it can't be reused
        await pool.query('UPDATE password_resets SET reset_token = NULL WHERE id = $1', [resetRecord.id]);

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
