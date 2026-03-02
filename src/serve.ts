import app from "./app";
import { connectWithRetry } from "./config/databases";

connectWithRetry()
  .then(() => {
    const port = process.env.PORT ? Number(process.env.PORT) : 5000;
    app.listen(port);
    console.log(`🦊 Elysia running at http://localhost:${port}`);
  })
  .catch((err) => {
    console.error("❌ Could not connect to database after retries:", err);
  });
