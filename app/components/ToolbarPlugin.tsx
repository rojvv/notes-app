import { createRef, useCallback, useEffect, useState } from "react";
import { Transition } from "react-transition-group";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { editorStore } from "../state";
import { getSelectedLink, getSelectedMark, $toggleSpoiler } from "../utilities";
import { toolbarButtons } from "../misc";

export function ToolbarPlugin() {
  const [editable, link] = editorStore((v) => [v.editable, v.link]);
  const divRef = createRef<HTMLDivElement>();
  const [editor] = useLexicalComposerContext();
  const bold = useState(false);
  const italic = useState(false);
  const underline = useState(false);
  const strikethrough = useState(false);
  const code = useState(false);
  const spoiler = useState(false);

  const states = {
    bold,
    italic,
    underline,
    strikethrough,
    code,
    spoiler,
  };

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    useCallback;
    $getSelection;
    $isRangeSelection;
    useEffect;
    useLexicalComposerContext;
    if ($isRangeSelection(selection)) {
      states.bold[1](selection.hasFormat("bold"));
      states.italic[1](selection.hasFormat("italic"));
      states.underline[1](selection.hasFormat("underline"));
      states.strikethrough[1](selection.hasFormat("strikethrough"));
      states.code[1](selection.hasFormat("code"));
      states.spoiler[1](getSelectedMark(selection) != null);
      editorStore.setState({ link: getSelectedLink(selection) != null });
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        $updateToolbar();
        editorStore.setState({
          empty: $getRoot().getTextContent().trim().length == 0,
        });
      });
    });
  }, [editor, $updateToolbar]);

  const boXwar = {
    entering: "h-0 opacity-0",
    entered: "h-[36px]",
    unmounted: "h-0 opacity-0",
    exited: "h-0 opacity-0",
    exiting: "h-0 opacity-0",
  };

  return (
    <Transition
      nodeRef={divRef}
      in={editable}
      timeout={150}
      unmountOnExit={true}
    >
      {(state) => (
        <div
          ref={divRef}
          className={`flex duration-[150ms] select-none overflow-hidden items-center text-center justify-center ${boXwar[state]}`}
        >
          {toolbarButtons.map(([stateId, icon, name, shortcut]) => (
            <button
              key={stateId}
              type="button"
              title={shortcut == null ? name :`${name} (${shortcut})`}
              onClick={() => {
                if (stateId == "link") {
                  editorStore.setState({ linkDialogOpen: true });
                } else if (stateId == "spoiler") {
                  editor.update(() => {
                    $toggleSpoiler();
                  });
                } else if (stateId == "help") {
                  editorStore.setState({ helpDialogOpen: true });
                } else {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, stateId);
                }
              }}
              className={`cursor-default py-1.5 px-2 h-full w-full text-[95%] flex items-center justify-center text-center border-b-2 duration-100 active:bg-hint/25 ${
                stateId != "help" &&
                (stateId == "link"
                  ? link
                  : states[stateId as keyof typeof states][0])
                  ? "border-button"
                  : "border-hint/25"
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </Transition>
  );
}
