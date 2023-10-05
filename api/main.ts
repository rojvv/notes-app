/// <reference lib="deno.ns" />
import {
  and,
  Application,
  CORS,
  eq,
  Router,
  sql,
  Status,
  webhookCallback,
} from "./deps.ts";
import { db, runMigrations } from "./database.ts";
import { notes } from "./schema.ts";
import { State } from "./types.ts";
import env from "./env.ts";
import { bot } from "./bot.ts";
import { getTitleAndAdditionalText, validateRequest } from "./utilities.ts";

const app = new Application<State>();
const router = new Router<State>();

app.use(CORS());

app.use(async (_ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.trace(err);
  }
});

const polling = Deno.env.get("POLLING") !== undefined;
const botTokenPath = `/${env.BOT_TOKEN.replaceAll(":", "\\:")}`;
router.post(botTokenPath, polling ? () => {} : webhookCallback(bot, "oak"));
router.get(botTokenPath, async (ctx) => {
  if (polling) {
    return;
  }
  try {
    ctx.response.body = await bot.api.setWebhook(ctx.request.url.toString(), {
      drop_pending_updates: true,
    });
  } catch (err) {
    ctx.response.body = err instanceof Error ? err.message : String(err);
  }
});

router.use(async (ctx, next) => {
  const state = await validateRequest(ctx.request.headers);
  if (state == null) {
    ctx.response.status = Status.Forbidden;
    return;
  }
  Object.assign(ctx.state, state);
  await next();
});

router.get("/notes/:id", async (ctx) => {
  const id = ctx.params.id;
  const [{ text }] = await db
    .select({ text: notes.text })
    .from(notes)
    .where(
      and(
        eq(notes.userId, ctx.state.user.id),
        eq(notes.id, id),
      ),
    );
  ctx.response.body = text;
});

router.post("/notes/:id", async (ctx) => {
  const id = ctx.params.id;
  const text = await ctx.request.body({ type: "text" }).value; // TODO: validate
  await db
    .update(notes)
    .set({ text }).where(
      and(
        eq(notes.userId, ctx.state.user.id),
        eq(notes.id, id),
      ),
    )
    .execute();
});

router.delete("/notes/:id", async (ctx) => {
  const id = ctx.params.id;
  await db
    .delete(notes)
    .where(and(
      eq(notes.userId, ctx.state.user.id),
      eq(notes.id, id),
    ))
    .execute();
});

router.get("/notes", async (ctx) => {
  const notes_ = await db
    .select({
      id: notes.id,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      title: notes.text,
    })
    .from(notes)
    .where(eq(notes.userId, ctx.state.user.id))
    .orderBy(
      sql`coalesce(${notes.updatedAt}, ${notes.createdAt}) DESC`,
    )
    .execute()
    .then((v) => v.map((v) => ({ ...v, additionalText: "" })));

  for (const n of notes_) {
    const { title, additionalText } = getTitleAndAdditionalText(n.title);

    n.title = title;
    n.additionalText = additionalText;
  }
  ctx.response.body = notes_;
});

router.post("/notes", async (ctx) => {
  const [{ id }] = await db
    .insert(notes)
    .values({ userId: ctx.state.user.id, text: "" })
    .returning({ id: notes.id })
    .execute();
  ctx.response.body = id;
});

app.use(router.routes());

app.use((ctx) => {
  return ctx.send({ root: env.APP_PATH, index: "index.html" });
});

await runMigrations();

if (polling) {
  bot.start({ drop_pending_updates: true });
}

app.listen({ hostname: env.HOST, port: env.PORT });
console.log(`http://${env.HOST}:${env.PORT}`);
