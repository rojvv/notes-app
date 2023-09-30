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

install(
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

createRoot(document.body).render(<App />);
