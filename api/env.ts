import { cleanEnv, loadSync, str, url } from "./deps.ts";

loadSync({ export: true });

export default cleanEnv(Deno.env.toObject(), {
  APP_PATH: str({ default: "../app/dist" }),
  BOT_TOKEN: str(),
  POSTGRESQL_URI: url(),
});
