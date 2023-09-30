import { and, Bot, BotConfig, Context, eq, MessageEntity, z } from "./deps.ts";
import env from "./env.ts";
import { db } from "./database.ts";
import { notes } from "./schema.ts";
import {
  collectTextAndEntities,
  getTitleAndAdditionalText,
} from "./utilities.ts";

const prodConfig = {};
const testConfig: BotConfig<Context> = {
  client: {
    buildUrl: (root, token, method) => `${root}/bot${token}/test/${method}`,
  },
};
export const bot = new Bot(
  env.BOT_TOKEN,
  Deno.env.get("TEST") ? testConfig : prodConfig,
);

bot.catch(console.trace);

bot.on("inline_query", async (ctx) => {
  let { query } = ctx.inlineQuery;
  query = query.trim();
  while (query.includes("  ")) {
    query.replaceAll("  ", " ");
  }
  query = query.toLowerCase();
  if (!query.startsWith("share ")) {
    return;
  }
  const id = query.slice("share ".length).trim();
  if (!id) {
    return;
  }

  try {
    await z.string().uuid().parseAsync(id);
  } catch {
    await ctx.answerInlineQuery([{
      id: crypto.randomUUID(),
      type: "article",
      title: "Invalid Identifier",
      input_message_content: {
        message_text: "Invalid Identifier",
      },
    }], { cache_time: 900 });
    return;
  }
  
  const notes_ = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, ctx.from.id),
        eq(notes.id, id),
      ),
    ).execute();
  if (notes_.length < 1) {
    await ctx.answerInlineQuery([{
      id: crypto.randomUUID(),
      type: "article",
      title: "Note Not Found",
      input_message_content: {
        message_text: "Note Not Found",
      },
    }], { cache_time: 900 });
  } else {
    const [note] = notes_;
    let text = "";
    let entities = new Array<MessageEntity>();
    try {
      const r = collectTextAndEntities(
        JSON.parse(note.text).root,
      );
      text = r[0];
      entities = r[1];
    } catch {
      //
    }
    const { title, additionalText: description } = getTitleAndAdditionalText(
      text,
    );
    await ctx.answerInlineQuery([{
      id: crypto.randomUUID(),
      type: "article",
      title,
      description,
      input_message_content: {
        message_text: text,
        entities,
      },
    }], { cache_time: 0 });
  }
});
