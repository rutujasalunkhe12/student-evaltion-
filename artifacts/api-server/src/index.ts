import { config } from "dotenv";
config({ path: "../../.env" });
import app from "./app";
import { logger } from "./lib/logger";

const isProduction = process.env["NODE_ENV"] === "production";
const rawPort =
  process.env["API_PORT"] ??
  (isProduction ? process.env["PORT"] : undefined) ??
  "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
