import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const schemaPath = join(rootDir, "prisma", "schema.prisma");

console.log("📦 Starting Vercel build process...");
console.log(`📁 Root directory: ${rootDir}`);
console.log(`📄 Schema path: ${schemaPath}`);

try {
  console.log("\n🚀 Running Prisma generate...");
  
  // Try with npx first (Vercel uses npm/node)
  const command = `npx prisma generate --schema=${schemaPath}`;
  
  execSync(command, {
    stdio: "inherit",
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: "production" },
  });
  
  console.log("✅ Prisma generate completed successfully!");
  console.log("🎉 Build process finished!\n");
} catch (err) {
  console.error("\n❌ Error during build process:");
  console.error(err);
  console.error("\nBuild failed. Please check the error above.\n");
  process.exit(1);
}
