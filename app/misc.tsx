import { WebApp } from "@grammyjs/web-app";

export const headers = { "x-init-data": WebApp.initData };

export enum MainButtonText {
  NewNote = "NEW NOTE",
  DeleteNote = "DELETE NOTE",
  ShareNote = "SHARE NOTE",
}

export const isMac = /macos|iphone|ipad|ipod/.test(
  navigator.userAgent.toLowerCase().replaceAll(" ", "")
);
const boldShortcut = isMac ? "⌘B" : "Ctrl+B";
const italicShortcut = isMac ? "⌘I" : "Ctrl+I";
const underlineShortcut = isMac ? "⇧⌘U" : "Ctrl+U"; // different
const strikethroughShortcut = isMac ? "⇧⌘X" : "Ctrl+U";
const codeShortcut = isMac ? "⇧⌘K" : "Ctrl+Shift+M"; // different
const linkShortcut = isMac ? "⌘U" : "Ctrl+K"; // different
const spoilerShortcut = isMac ? "⇧⌘S" : "Ctrl+Shift+S"; // different

const s = (v: string) => ` (${v})`;
export const formattingButtons = [
  ["bold", <span>B</span>, "Bold" + s(boldShortcut)],
  ["italic", <span>I</span>, "Italic" + s(italicShortcut)],
  ["underline", <span>U</span>, "Underline" + s(underlineShortcut)],
  ["strikethrough", <span>X</span>, "Strikethrough" + s(strikethroughShortcut)],
  ["code", <span>C</span>, "Code" + s(codeShortcut)],
  ["link", <span>L</span>, "Link" + s(linkShortcut)],
  ["spoiler", <span>S</span>, "Spoiler" + s(spoilerShortcut)],
] as const;
