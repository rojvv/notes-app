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

// In macOS, iOS, and iPadOS the transformation shortcuts will be the same as Telegram macOS.
// In other operating systems the transformation shortcuts will be the same as Telegram Desktop.
const boldShortcut = isMac ? "⌘B" : "Ctrl+B";
const italicShortcut = isMac ? "⌘I" : "Ctrl+I";
const underlineShortcut = isMac ? "⇧⌘U" : "Ctrl+U"; // different
const strikethroughShortcut = isMac ? "⇧⌘X" : "Ctrl+U";
const codeShortcut = isMac ? "⇧⌘K" : "Ctrl+Shift+M"; // different
const linkShortcut = isMac ? "⌘U" : "Ctrl+K"; // different
const spoilerShortcut = isMac ? "⇧⌘S" : "Ctrl+Shift+S"; // different

export const toolbarButtons = [
  ["bold", <span>B</span>, "Bold", boldShortcut],
  ["italic", <span>I</span>, "Italic", italicShortcut],
  ["underline", <span>U</span>, "Underline", underlineShortcut],
  ["strikethrough", <span>X</span>, "Strikethrough", strikethroughShortcut],
  ["code", <span>C</span>, "Code", codeShortcut],
  ["link", <span>L</span>, "Link", linkShortcut],
  ["spoiler", <span>S</span>, "Spoiler", spoilerShortcut],
  ["help", <span>?</span>, "Help", null],
] as const;
