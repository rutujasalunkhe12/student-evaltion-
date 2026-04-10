import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["src/schema/users.ts", "src/schema/batches.ts", "src/schema/evaluations.ts"],
  dialect: "sqlite",
  dbCredentials: {
    url: "./eval_portal.db",
  },
});
