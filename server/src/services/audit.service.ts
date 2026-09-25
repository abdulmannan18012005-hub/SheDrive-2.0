import { pool } from '../config/db';

export const logAudit = async (
    adminId: string,
    action: string,
    targetEntity: string,
    targetId: string,
    details: string,
    ipAddress: string
): Promise<void> => {
    try {
        const fullDetails = `[Entity: ${targetEntity} ID: ${targetId}] ${details}`;
        await pool.query(
            `INSERT INTO audit_logs (id, user_id, action, details, ip_address, timestamp)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
            [adminId, action, fullDetails, ipAddress, Date.now()]
        );
    } catch (err) {
        console.error('Failed to write audit log:', err);
    }
};
