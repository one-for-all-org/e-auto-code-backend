import app from "./app";
import { env } from "./config/env";
import { initDb } from "./config/init-db";
import { closeDb } from "./config/db";

async function startServer() {
  await initDb();
  const server = app.listen(Number(env.PORT), () => {
    console.log(`Serveur démarré sur le port ${env.PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      void closeDb();
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void startServer().catch(async (error) => {
  console.error("Échec du démarrage du serveur:", error);
  await closeDb();
  process.exitCode = 1;
});
