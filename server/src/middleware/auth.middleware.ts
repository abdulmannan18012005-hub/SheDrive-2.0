import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }
    
    jwt.verify(token, SECRET, (err: any, user: any) => {
        if (err) {
            res.status(403).json({ error: 'Forbidden: Invalid token' });
            return;
        }
        req.user = user;
        next();
    });
};

export const requireRole = (role: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || req.user.role !== role) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
