import { drizzle, migrate, postgres, PostgresJsDatabase } from "./deps.ts";
import env from "./env.ts";

const client = postgres(env.POSTGRESQL_URI, { onnotice: () => {} });
// @ts-ignore: works
export const db: PostgresJsDatabase = drizzle(client);

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await client`CREATE OR REPLACE FUNCTION reset_updated_at()   
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.text != NEW.text THEN
      NEW.updated_at = now();
    END IF;
    RETURN NEW;   
END;
$$ language 'plpgsql'`;
  await client`CREATE OR REPLACE TRIGGER _reset_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE PROCEDURE reset_updated_at()`;
}
