import { createRoot } from "react-dom/client";
import { install, defineConfig } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";
import { WebApp } from "@grammyjs/web-app";
import { App } from "./App";
import "./main.css";
import { loadNotes } from "./state";

const {
  bg_color = "#17212b",
  button_color = "#5288c1",
  button_text_color = "#ffffff",
  hint_color = "#708499",
  link_color = "#6ab3f3",
  secondary_bg_color = "#232e3c",
  text_color = "#f5f5f5",
} = WebApp.themeParams ?? {};

loadNotes();

const tw = install(
  defineConfig({
    hash: false, // must be false
    presets: [presetAutoprefix(), presetTailwind()],
    theme: {
      extend: {
        colors: {
          bg: bg_color,
          button: button_color,
          text: text_color,
          button_text: button_text_color,
          hint: hint_color,
          link: link_color,
          secondary_bg: secondary_bg_color,
        },
      },
    },
  })
);

// classes used in LinkDialog
tw(`fixed w-full h-screen top-0 left-0 bg-bg/60 z-[9999] flex items-center justify-center p-5 select-none duration-200
w-full bg-secondary_bg p-5 max-w-md rounded-md flex flex-col gap-5
border-hint/25 bg-transparent border-b-[2px] text-lg px-1.5 py-1 focus:border-button duration-75 outline-none focus:outline-none
flex items-center justify-end w-full
text-button px-4 py-1 hover:opacity-75 duration-75
text-button_text bg-button px-4 py-1 rounded-md hover:opacity-75 duration-75`);

createRoot(document.body).render(<App />);
