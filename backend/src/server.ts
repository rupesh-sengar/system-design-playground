import "dotenv/config";
import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

const start = async (): Promise<void> => {
  const config = getEnv();
  const app = await buildApp(config);

  await app.listen({
    host: config.HOST,
    port: config.PORT,
  });
};

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
