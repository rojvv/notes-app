import { useEffect, createRef, useState } from "react";
import { Transition } from "react-transition-group";
import { WebApp } from "@grammyjs/web-app";
import { Note } from "./views/Note";
import { Notes } from "./views/Notes";
import { View, editorStore, loadNote, loadNotes, viewStore } from "./state";
import { headers, MainButtonText } from "./misc";

WebApp.MainButton.onClick(async () => {
  WebApp.MainButton.disable();
  try {
    if (WebApp.MainButton.text == MainButtonText.NewNote) {
      const res = await fetch("/notes", { method: "POST", headers });
      if (res.status == 200) {
        const id = await res.text();
        loadNote(id, true);
      }
    } else if (WebApp.MainButton.text == MainButtonText.DeleteNote) {
      const { view } = viewStore.getState();
      if (view._ != "note") {
        return;
      }
      await fetch(`/notes/${view.id}`, { method: "DELETE", headers });
      viewStore.setState({ view: { _: "notes" } });
    } else if (WebApp.MainButton.text == MainButtonText.ShareNote) {
      const { view } = viewStore.getState();
      if (view._ != "note") {
        return;
      }
      WebApp.switchInlineQuery("share " + view.id, [
        "users",
        "bots",
        "channels",
        "groups",
      ]);
    }
  } finally {
    WebApp.MainButton.enable();
  }
});

let busy = false;
WebApp.BackButton.onClick(async () => {
  if (busy) {
    return;
  }
  busy = true;
  try {
    const p = loadNotes();
    viewStore.setState({ view: { _: "notes" } });
    await p;
  } finally {
    busy = false;
  }
});

function T2({ view }: { view: View & { _: "notes" | "note" } }) {
  const divRef = createRef<HTMLDivElement>();
  const div2Ref = createRef<HTMLDivElement>();

  const left = {
    entering: "absolute top-0",
    entered: "absolute top-0",
    unmounted: "absolute top-0 translate-x-[-100%]",
    exited: "absolute top-0 translate-x-[-100%]",
    exiting: "absolute top-0 translate-x-[-100%]",
  };

  const right = {
    entering: "absolute top-0",
    entered: "absolute top-0",
    unmounted: "absolute top-0 translate-x-[100%]",
    exited: "absolute top-0 translate-x-[100%]",
    exiting: "absolute top-0 translate-x-[100%]",
  };

  const [lastNote, setLastNote] = useState<(View & { _: "note" }) | null>(null);

  useEffect(() => {
    if (view._ == "note") {
      setLastNote(view);
      editorStore.setState({ shouldFocus: true });
    }
  }, [view]);

  return (
    <>
      <Transition in={view._ == "notes"} nodeRef={divRef} timeout={300}>
        {(state) => (
          <div
            ref={divRef}
            className={`duration-300 ease-in-out w-full ${left[state]}`}
          >
            <Notes />
          </div>
        )}
      </Transition>
      <Transition
        in={view._ == "note" && lastNote != null}
        nodeRef={div2Ref}
        timeout={300}
      >
        {(state) => (
          <div
            ref={div2Ref}
            className={`duration-300 ease-in-out w-full ${right[state]}`}
          >
            {lastNote && (
              <Note id={lastNote.id} initialState={lastNote.initialState} />
            )}
          </div>
        )}
      </Transition>
    </>
  );
}

function CurrentView() {
  const [isEmpty, editable] = editorStore((v) => [v.empty, v.editable]);
  const view = viewStore((v) => v.view);

  useEffect(() => {
    switch (view._) {
      case "notes":
        loadNotes();
        WebApp.BackButton.hide();
        WebApp.MainButton.setParams({
          text: MainButtonText.NewNote,
          is_active: true,
          is_visible: true,
          text_color: WebApp.themeParams.button_text_color,
          color: WebApp.themeParams.button_color,
        });
        break;
      default:
        WebApp.BackButton.show();

        if (editable) {
          WebApp.MainButton.setParams({ is_visible: false });
          // WebApp.MainButton.setText('SEND')
        } else if (!editable) {
          if (isEmpty) {
            WebApp.MainButton.setParams({
              text: MainButtonText.DeleteNote,
              is_active: true,
              is_visible: true,
              text_color: "#ffffff",
              color: "#e63946",
            });
          } else {
            WebApp.MainButton.setParams({
              text: MainButtonText.ShareNote,
              is_active: true,
              is_visible: true,
              text_color: "#ffffff",
              color: "#4CAF50",
            });
          }
        }
    }
  }, [view, isEmpty, editable]);

  if (view._ == "notes" || view._ == "note") {
    return <T2 view={view} />;
  } else {
    return <>Invalid view ${JSON.stringify(view)}</>;
  }
}

export function App() {
  return (
    <main className="w-full h-full">
      <CurrentView />
    </main>
  );
}
