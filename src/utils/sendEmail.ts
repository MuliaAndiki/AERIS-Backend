import nodemailer from "nodemailer";
import { env } from "@/config/env.config";

export const sendOTPEmail = async (to: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"NutriPlate" <${env.SMTP_USER}>`,
    to,
    subject: "Kode OTP Verifikasi Akun Anda",
    text: `Kode OTP kamu adalah: ${otp}`,
    html: `<p>Kode OTP kamu adalah: <b>${otp}</b></p><p>Jangan berikan kode ini ke siapa pun.</p>`,
  });
};
