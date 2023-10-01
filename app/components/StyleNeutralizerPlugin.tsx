import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { getSelectedLinksAndMarks } from "../utilities";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isMarkNode, $unwrapMarkNode } from "@lexical/mark";

export function StyleNeutralizerPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const a = editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (p) => {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          if (p != "code" && selection.hasFormat("code")) {
            selection.formatText("code");
          }
          if (p != "code") {
            return false;
          }

          do {
            if (selection.hasFormat("bold")) {
              selection.formatText("bold");
            } else if (selection.hasFormat("italic")) {
              selection.formatText("italic");
            } else if (selection.hasFormat("strikethrough")) {
              selection.formatText("strikethrough");
            } else if (selection.hasFormat("underline")) {
              selection.formatText("underline");
            }
          } while (
            selection.hasFormat("bold") ||
            selection.hasFormat("italic") ||
            selection.hasFormat("strikethrough") ||
            selection.hasFormat("underline")
          );

          for (const m of getSelectedLinksAndMarks(selection)) {
            if ($isMarkNode(m)) {
              $unwrapMarkNode(m);
            } else if ($isLinkNode(m)) {
              // https://github.com/facebook/lexical/blob/7b0ad1be729f705f5b7bcc3d4b4a7eb258b04ee6/packages/lexical-link/src/index.ts#L437-L444
              const children = m.getChildren();
              for (let i = 0; i < children.length; i++) {
                m.insertBefore(children[i]);
              }
              m.remove();
            }
          }
        });
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
    const b = editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        if (payload != null) {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          if (selection.hasFormat("code")) {
            selection.formatText("code");
          }
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
    return () => void a() && b();
  }, [editor]);

  return null;
}
