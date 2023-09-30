import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { useEffect } from "react";

export function StyleNeutralizerPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
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

          for (const node of selection.getNodes()) {
            if (node.getType() == "username") {
              node.replace($createTextNode(node.getTextContent()));
            }
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
        });
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
}
