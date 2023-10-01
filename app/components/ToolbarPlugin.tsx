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
import { getSelectedLink } from "../utilities";

const formattingButtons = [
  ["bold", <span>B</span>, "Bold - Ctrl+B"],
  ["italic", <span>I</span>, "Italic - Ctrl+I"],
  ["underline", <span>U</span>, "Underline - Ctrl+U"],
  ["strikethrough", <span>S</span>, "Strikethrough - Ctrl+Shift+X"],
  ["code", <span>C</span>, "Code - Ctrl+Shift+M"],
  ["link", <span>L</span>, "Link - Ctrl+K"],
] as const;

export function ToolbarPlugin() {
  const [editable, link] = editorStore((v) => [v.editable, v.link]);
  const divRef = createRef<HTMLDivElement>();
  const [editor] = useLexicalComposerContext();
  const bold = useState(false);
  const italic = useState(false);
  const underline = useState(false);
  const strikethrough = useState(false);
  const code = useState(false);

  const states = {
    bold,
    italic,
    underline,
    strikethrough,
    code,
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
          {formattingButtons.map(([stateId, icon, title]) => (
            <button
              key={stateId}
              type="button"
              title={title}
              onClick={() => {
                if (stateId == "link") {
                  editorStore.setState({ linkDialogOpen: true });
                  return;
                }
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, stateId);
              }}
              className={`cursor-default py-1.5 px-2 h-full w-full text-[95%] flex items-center justify-center text-center border-b-2 duration-100 active:bg-hint/25 ${
                (
                  stateId == "link"
                    ? link
                    : states[stateId as keyof typeof states][0]
                )
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
