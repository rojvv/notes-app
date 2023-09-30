import { useEffect } from "react";
import { $getRoot } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { editorStore, viewStore } from "../state";

export function StateSyncPlugin() {
  const view = viewStore((v) => v.view);
  const [editor] = useLexicalComposerContext();
  const editable = editorStore((v) => v.editable);

  useEffect(() => {
    if (view._ != "note") {
      return;
    }
    try {
      const n = JSON.parse(view.initialState);
      editor.setEditorState(editor.parseEditorState(n));
    } catch (err) {
      if (
        (err instanceof Error && err.message.includes("38")) ||
        view.initialState.trim().length == 0
      ) {
        editor.update(() => {
          $getRoot().clear();
        });
      }
    }
  }, [view]);

  useEffect(() => {
    return editor.registerEditableListener((editable) => {
      editorStore.setState({ editable });
    });
  }, [editor]);

  useEffect(() => {
    editor.setEditable(editable);
  }, [editable]);

  return null;
}
