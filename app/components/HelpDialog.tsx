import { Fragment, createRef, useEffect } from "react";
import { Transition } from "react-transition-group";
import { editorStore } from "../state";
import { formattingButtons } from "../misc";

const c = {
  entering: "opacity-1",
  entered: "opacity-1",
  exiting: "opacity-0",
  exited: "opacity-0",
  unmounted: "opacity-0",
};

const close = (e: KeyboardEvent) => {
  if (e.key == "Escape") {
    editorStore.setState({ helpDialogOpen: false });
  }
};

export function HelpDialog() {
  const divRef = createRef<HTMLDivElement>();
  const open = editorStore((v) => v.helpDialogOpen);

  useEffect(() => {
    if (open) {
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
              editorStore.setState({ helpDialogOpen: false });
            }
          }}
        >
          <div className="w-full bg-secondary_bg p-5 max-w-md rounded-md flex flex-col gap-5">
            <div className="grid grid-cols-2">
              <div className="col-span-2 grid grid-cols-2 font-bold border-b border-hint/25 mb-1 pb-1">
                <span>Transformation</span>
                <span>Shortcut</span>
              </div>
              {formattingButtons.map(([k, v, t]) => (
                <Fragment key={k}>
                  <div className="flex">
                    <div className="flex w-4">{v}</div>{" "}
                    <div>{t.slice(0, t.indexOf("(") - 1)}</div>
                  </div>
                  <span>{t.slice(t.indexOf("(") + 1, t.length - 1)}</span>
                </Fragment>
              ))}
            </div>
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                className="text-button px-4 py-1 hover:opacity-75 duration-75"
                onClick={() => editorStore.setState({ helpDialogOpen: false })}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </Transition>
  );
}
