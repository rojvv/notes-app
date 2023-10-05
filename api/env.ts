import { cleanEnv, host, loadSync, port, str, url } from "./deps.ts";

loadSync({ export: true });

export default cleanEnv(Deno.env.toObject(), {
  HOST: host({ default: "localhost" }),
  PORT: port({ default: 3000 }),
  APP_PATH: str({ default: "../app/dist" }),
  WEB_APP_URL: str({ default: "" }),
  BOT_TOKEN: str(),
  POSTGRESQL_URI: url(),
});
