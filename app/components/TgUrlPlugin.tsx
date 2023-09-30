
import { useCallback, useEffect } from "react";
import {
  $applyNodeReplacement,
  EditorConfig,
  TextNode,
  type SerializedTextNode,
} from "lexical";
import { addClassNamesToElement } from "@lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalTextEntity } from "@lexical/react/useLexicalTextEntity";
import { findTgUrls } from "../lib/pmodes/match";

export class TgUrlNode extends TextNode {
  static importJSON(serializedNode: SerializedTextNode): TgUrlNode {
    const node = $createTgUrlNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  static getType(): string {
    return "tgurl";
  }

  static clone(node: TgUrlNode): TgUrlNode {
    return new TgUrlNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.tgurl);
    return element;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "tgurl",
    };
  }

  isTextEntity(): true {
    return true;
  }
}

function $createTgUrlNode(text = ""): TgUrlNode {
  return $applyNodeReplacement(new TgUrlNode(text));
}

export function TgUrlPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TgUrlNode])) {
      throw new Error("TgUrlNode: TgUrlNode not registered on editor");
    }
  }, [editor]);

  const createTgUrlNode = useCallback((textNode: TextNode): TgUrlNode => {
    return $createTgUrlNode(textNode.getTextContent());
  }, []);

  const getTgUrlMatch = useCallback((text: string) => {
    const tgurls = findTgUrls(new TextEncoder().encode(text));
    if (tgurls.length < 1) {
      return null;
    }
    return {
      start: tgurls[0][0],
      end: tgurls[0][1],
    };
  }, []);

  useLexicalTextEntity<TgUrlNode>(getTgUrlMatch, TgUrlNode, createTgUrlNode);

  return null;
}
