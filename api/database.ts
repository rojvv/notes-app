import { drizzle, migrate, postgres, PostgresJsDatabase } from "./deps.ts";
import env from "./env.ts";

const client = postgres(env.POSTGRESQL_URI, { onnotice: () => {} });
// @ts-ignore: works
export const db: PostgresJsDatabase = drizzle(client);

export function runMigrations() {
  return migrate(db, { migrationsFolder: "./drizzle" });
}
