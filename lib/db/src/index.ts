let db: any;
let isMockDb = false;

import * as schema from "./schema";

const initDb = async () => {
  try {
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const Database = (await import("better-sqlite3")).default;
    const sqlite = new Database("eval_portal.db");
    db = drizzle(sqlite, { schema });
    isMockDb = false;
  } catch (error) {
    console.warn("SQLite not available, using mock DB");
    isMockDb = true;
    db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => []
          })
        })
      })
    };
  }
};

await initDb();

export { db };
export { isMockDb };
export * from "./schema";
