import { createRef, useEffect, useState } from "react";
import { Transition } from "react-transition-group";
import { editorStore } from "../state";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";

const c = {
  entering: "opacity-1",
  entered: "opacity-1",
  exiting: "opacity-0",
  exited: "opacity-0",
  unmounted: "opacity-0",
};

const close = (e: KeyboardEvent) => {
  if (e.key == "Escape") {
    editorStore.setState({ linkDialogOpen: false });
  }
};

export function LinkDialog() {
  const [url, setUrl] = useState("");
  const [editor] = useLexicalComposerContext();
  const divRef = createRef<HTMLDivElement>();
  const inputRef = createRef<HTMLInputElement>();
  const [open, link] = editorStore((v) => [v.linkDialogOpen, v.link]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      window.addEventListener("keydown", close);
      return () => window.removeEventListener("keydown", close);
    } else {
      window.removeEventListener("keydown", close);
    }
  }, [open]);

  return (
    <Transition in={open} timeout={150} unmountOnExit={true} nodeRef={divRef}>
      {(state) => (
        <div
          ref={divRef}
          className={`fixed w-full h-screen top-0 left-0 bg-bg/60 z-[9999] flex items-center justify-center p-5 select-none duration-150 ${c[state]}`}
          onClick={(e) => {
            if (e.currentTarget == e.target) {
              editorStore.setState({ linkDialogOpen: false });
            }
          }}
        >
          <form
            className="w-full bg-secondary_bg p-5 max-w-md rounded-md flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const url_ = data.get("url") as string;
              try {
                const url = new URL(url_);
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.toString());
              } catch {
                if (!link) {
                  inputRef.current?.focus();
                } else if (url_ === "") {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                }
              }
              editorStore.setState({ linkDialogOpen: false });
            }}
          >
            <input
              value={url}
              required={!link}
              onChange={(e) => setUrl(e.target.value)}
              ref={inputRef}
              type="url"
              name="url"
              placeholder="URL"
              className="border-hint/25 bg-transparent border-b-[2px] text-lg px-1.5 py-1 focus:border-button duration-75 outline-none focus:outline-none"
            />
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                className="text-button px-4 py-1 hover:opacity-75 duration-75"
                onClick={() => editorStore.setState({ linkDialogOpen: false })}
              >
                Cancel
              </button>
              <button className="text-button_text bg-button px-4 py-1 rounded-md hover:opacity-75 duration-75">
                {link ? (url == "" ? "Remove" : "Update") : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Transition>
  );
}
