import "dotenv/config";
import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

const start = async (): Promise<void> => {
  const config = getEnv();
  const app = buildApp(config);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(config.PORT, config.HOST, () => {
      console.info(
        `API server listening on http://${config.HOST}:${config.PORT}`,
      );
      resolve();
    });

    server.on("error", reject);
  });
};

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
