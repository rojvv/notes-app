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
import { findHashtags } from "../lib/pmodes/match";

export class HashtagNode extends TextNode {
  static importJSON(serializedNode: SerializedTextNode): HashtagNode {
    const node = $createHashtagNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  static getType(): string {
    return "hashtag";
  }

  static clone(node: HashtagNode): HashtagNode {
    return new HashtagNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.hashtag);
    return element;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "hashtag",
    };
  }

  isTextEntity(): true {
    return true;
  }
}

function $createHashtagNode(text = ""): HashtagNode {
  return $applyNodeReplacement(new HashtagNode(text));
}

export function HashtagPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([HashtagNode])) {
      throw new Error("HashtagNode: HashtagNode not registered on editor");
    }
  }, [editor]);

  const createHashtagNode = useCallback((textNode: TextNode): HashtagNode => {
    return $createHashtagNode(textNode.getTextContent());
  }, []);

  const getHashtagMatch = useCallback((text: string) => {
    const hashtag = findHashtags(new TextEncoder().encode(text));
    if (hashtag.length < 1) {
      return null;
    }
    return {
      start: hashtag[0][0],
      end: hashtag[0][1],
    };
  }, []);

  useLexicalTextEntity<HashtagNode>(
    getHashtagMatch,
    HashtagNode,
    createHashtagNode
  );

  return null;
}
