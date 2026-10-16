import { config } from "./config";
import { app } from "./app";
import { prisma } from "./prisma";

const server = app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);