import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NODE_ENV: z.string(),
  PORT: z.string(),
  JWT_SECRET: z.string(),
  FRONTEND_URL: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform((val) => Number(val)),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_SECURE: z.preprocess((val) => val === "true", z.boolean()),
  SUPABASEPW: z.string(),
  API_NINJA: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(" Invalid Env Variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
