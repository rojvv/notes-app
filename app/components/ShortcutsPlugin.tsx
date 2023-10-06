import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_MODIFIER_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { editorStore } from "../state";
import { $toggleSpoiler } from "../utilities";
import { isMac } from "../misc";

const codeKey = isMac ? "KeyK" : "KeyM";

export function ShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const a = editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const event: KeyboardEvent = payload;
        const { code, ctrlKey, metaKey, shiftKey } = event;
        if (code == "KeyX" && (ctrlKey || metaKey) && shiftKey) {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
        } else if (code == codeKey && (ctrlKey || metaKey) && shiftKey) {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          return true;
        } else if (code == "KeyK" && (ctrlKey || metaKey) && !isMac) {
          event.preventDefault();
          editorStore.setState({ linkDialogOpen: true });
          return true;
        } else if (code == "KeyS" && (ctrlKey || metaKey) && shiftKey) {
          event.preventDefault();
          $toggleSpoiler();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
    const b = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (payload) => {
        const event: KeyboardEvent = payload;
        const { code, ctrlKey, metaKey, shiftKey } = event;
        if (code == "KeyU" && (ctrlKey || metaKey) && !shiftKey && isMac) {
          event.preventDefault();
          editorStore.setState({ linkDialogOpen: true });
          return true;
        } else if (
          code == "KeyU" &&
          (ctrlKey || metaKey) &&
          shiftKey &&
          isMac
        ) {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
          return true;
        } else {
          return false;
        }
      },
      COMMAND_PRIORITY_CRITICAL
    );
    return () => void a() && b();
  }, [editor]);

  return null;
}
