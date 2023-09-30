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
import { findCashtags } from "../lib/pmodes/match";

export class CashtagNode extends TextNode {
  static importJSON(serializedNode: SerializedTextNode): CashtagNode {
    const node = $createCashtagNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  static getType(): string {
    return "cashtag";
  }

  static clone(node: CashtagNode): CashtagNode {
    return new CashtagNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.cashtag);
    return element;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "cashtag",
    };
  }

  isTextEntity(): true {
    return true;
  }
}

function $createCashtagNode(text = ""): CashtagNode {
  return $applyNodeReplacement(new CashtagNode(text));
}

export function CashtagPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CashtagNode])) {
      throw new Error("CashtagNode: CashtagNode not registered on editor");
    }
  }, [editor]);

  const createCashtagNode = useCallback((textNode: TextNode): CashtagNode => {
    return $createCashtagNode(textNode.getTextContent());
  }, []);

  const getCashtagMatch = useCallback((text: string) => {
    const cashtag = findCashtags(new TextEncoder().encode(text));
    if (cashtag.length < 1) {
      return null;
    }
    return {
      start: cashtag[0][0],
      end: cashtag[0][1],
    };
  }, []);

  useLexicalTextEntity<CashtagNode>(
    getCashtagMatch,
    CashtagNode,
    createCashtagNode
  );

  return null;
}
