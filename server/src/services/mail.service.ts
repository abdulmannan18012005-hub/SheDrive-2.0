export const sendOtpEmail = async (email: string, otp: string): Promise<void> => {
    // In production, this would use nodemailer, SendGrid, etc.
    console.log(`\n=========================================`);
    console.log(`[MAIL SERVICE] To: ${email}`);
    console.log(`[MAIL SERVICE] Subject: Your Password Reset OTP`);
    console.log(`[MAIL SERVICE] Body: Your OTP code is ${otp}. It expires in 5 minutes.`);
    console.log(`=========================================\n`);
};
