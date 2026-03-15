import prisma from "prisma/client";

export async function connectPrismaWithRetry(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully!");
      return;
    } catch (err) {
      console.error(`⏳ Failed to connect (attempt ${i + 1}/${retries})`);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
