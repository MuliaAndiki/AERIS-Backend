import app from "./app";
import { connectWithRetry } from "./config/databases";
import { env } from "./config/env.config";
import { initSocket } from "./utils/socket";
const port = Number.isFinite(env.PORT) ? env.PORT : 5000;

app.onStart(() => {
  console.log(`🦊 Elysia running at http://localhost:${port}`);
});

async function connected() {
  try {
    await connectWithRetry();
    await initSocket();

    app.listen({
      port,
      hostname: "0.0.0.0",
    });
  } catch (error) {
    console.error("❌ Could not connect to database after retries:", error);
    process.exit(1);
  }
}

connected();
