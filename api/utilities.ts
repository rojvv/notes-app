import { MessageEntity } from "./deps.ts";
import env from "./env.ts";
import { State } from "./types.ts";

export enum Format {
  Bold = 1,
  Italic = 1 << 1,
  Strikethrough = 1 << 2,
  Underline = 1 << 3,
  Code = 1 << 4,
}

function hasFormat(format: number, f: Format) {
  return (format & f) != 0;
} // deno-lint-ignore no-explicit-any
export function collectTextAndEntities(node: any): [string, MessageEntity[]] {
  let text = "";
  const entities = new Array<MessageEntity>();
  const { text: t, spoilers } = collectTextAndFormat(node);
  for (const s of spoilers) {
    entities.push({ ...s, type: "spoiler" });
  }
  for (const { text: text_, format, link } of t) {
    const offset = text.length;
    const length = text_.length;
    if (link !== undefined) {
      entities.push({ type: "text_link", offset, length, url: link });
    }
    if (format === undefined) {
      text += text_;
      continue;
    }
    if (hasFormat(format, Format.Code)) {
      entities.push({ type: "code", offset, length });
    } else {
      if (hasFormat(format, Format.Bold)) {
        entities.push({ type: "bold", offset, length });
      }
      if (hasFormat(format, Format.Italic)) {
        entities.push({ type: "italic", offset, length });
      }
      if (hasFormat(format, Format.Strikethrough)) {
        entities.push({ type: "strikethrough", offset, length });
      }
      if (hasFormat(format, Format.Underline)) {
        entities.push({ type: "underline", offset, length });
      }
    }
    text += text_;
  }
  return [text, entities];
}

// deno-lint-ignore no-explicit-any
export function collectText(node: any) {
  return collectTextAndFormat(node).text.map((v) => v.text)
    .join("");
}
const extend = (
  text: ReturnType<typeof collectTextAndFormat>["text"],
  spoilers: ReturnType<typeof collectTextAndFormat>["spoilers"],
  ret: ReturnType<typeof collectTextAndFormat>,
  link?: string,
) => {
  for (const i of ret.text) {
    text.push({ ...i, link: typeof link === "string" ? link : i.link });
  }
  for (const i of ret.spoilers) {
    spoilers.push(i);
  }
};
// deno-lint-ignore no-explicit-any
function collectTextAndFormat(node: any, offset = 0) {
  const text = new Array<{ text: string; format?: number; link?: string }>();
  const spoilers = new Array<{ offset: number; length: number }>();
  const getOffset = () => offset + text.map((v) => v.text).join("").length;
  try {
    if (Array.isArray(node)) {
      for (const i of node) {
        extend(text, spoilers, collectTextAndFormat(i, getOffset()));
      }
      return { text, spoilers };
    }
    if (node.type == "paragraph") {
      extend(text, spoilers, collectTextAndFormat(node.children, getOffset()));
      text.push({ text: "\n" });
    } else if (node.type == "mark") {
      const offset = getOffset();
      const r = collectTextAndFormat(node.children, getOffset());
      const length = r.text.map((v) => v.text).join("").length;
      extend(text, spoilers, r);
      spoilers.push({ offset, length });
    } else if ("text" in node) {
      let format = 0;
      if ("format" in node && typeof node.format === "number") {
        format = node.format;
      }
      text.push({ text: node.text, format });
    } else if ("children" in node) {
      for (const child of node.children) {
        extend(
          text,
          spoilers,
          collectTextAndFormat(child, getOffset()),
          node.type == "link" ? node.url : undefined,
        );
      }
    }
  } catch {
    //
  }
  return { text, spoilers };
}

function summarize(string: string, label: string) {
  for (
    const [r, p] of ([[/ {2}/g, " "], [/(?:(?! )\s)/g, ""]] as const).values()
  ) {
    if (r.test(string)) {
      string = string.replaceAll(r, p);
    }
  }
  const wasLonger = string.length > 100;
  string = string.trim().slice(0, 100);
  if (!string) {
    string = "No " + label;
  } else if (wasLonger) {
    string = string.slice(0, 100 - 3) + "...";
  }
  return string;
}
export function getTitleAndAdditionalText(text: string) {
  try {
    text = collectText(JSON.parse(text).root);
  } catch {
    //
  }
  const [title_, ...additionalText_] = text.split("\n");
  const title = summarize(title_, "Title");
  const additionalText = summarize(
    additionalText_.join("\n"),
    "Additional Text",
  );
  return { title, additionalText };
}

export async function validateRequest(
  headers: Headers,
): Promise<State | null> {
  const initData = headers.get("x-init-data") ?? undefined;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const data = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(
    ([k, v]) => `${k}=${v}`,
  ).join("\n");

  const algo = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("WebAppData"),
    algo,
    true,
    ["sign", "verify"],
  );

  const secretKey_ = await crypto.subtle.sign(
    algo,
    key,
    new TextEncoder().encode(env.BOT_TOKEN),
  );
  const secretKey = await crypto.subtle.importKey(
    "raw",
    secretKey_,
    algo,
    true,
    ["sign", "verify"],
  );

  const actual = [
    ...new Uint8Array(
      await crypto.subtle.sign(
        algo,
        secretKey,
        new TextEncoder().encode(data),
      ),
    ),
  ].map((v) => v.toString(16).padStart(2, "0")).join("");

  if (actual == hash) {
    return Object.fromEntries(
      [...params.entries()].map(([k, v]) => {
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      }).concat([["hash", hash]]),
    );
  } else {
    return null;
  }
}
