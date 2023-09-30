import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { editorStore } from "../state";

export function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();
  const [editable, shouldFocus] = editorStore((v) => [
    v.editable,
    v.shouldFocus,
  ]);

  useEffect(() => {
    if (!editable) {
      return;
    }
    editorStore.setState({ shouldFocus: true });
  }, [editable]);

  useEffect(() => {
    if (!shouldFocus) {
      return;
    }

    editor.focus(() => {
      const activeElement = document.activeElement;
      const rootElement = editor.getRootElement() as HTMLDivElement;
      if (
        rootElement !== null &&
        (activeElement === null || !rootElement.contains(activeElement))
      ) {
        rootElement.focus({ preventScroll: true });
      }
    });

    editorStore.setState({ shouldFocus: false });
  }, [shouldFocus]);

  return null;
}
