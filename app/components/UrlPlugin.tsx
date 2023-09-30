import { useCallback, useEffect } from "react";
import {
  $applyNodeReplacement,
  EditorConfig,
  TextNode,
  type SerializedTextNode,
  $getNodeByKey,
} from "lexical";
import { addClassNamesToElement } from "@lexical/utils";
import { NodeEventPlugin } from "@lexical/react/LexicalNodeEventPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalTextEntity } from "@lexical/react/useLexicalTextEntity";
import { findUrls } from "../lib/pmodes/match";
import { WebApp } from "@grammyjs/web-app";

export class UrlNode extends TextNode {
  static importJSON(serializedNode: SerializedTextNode): UrlNode {
    const node = $createUrlNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  static getType(): string {
    return "url";
  }

  static clone(node: UrlNode): UrlNode {
    return new UrlNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.url);
    return element;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "url",
    };
  }

  isTextEntity(): true {
    return true;
  }
}

function $createUrlNode(text = ""): UrlNode {
  return $applyNodeReplacement(new UrlNode(text));
}

export function UrlPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([UrlNode])) {
      throw new Error("UrlNode: UrlNode not registered on editor");
    }
  }, [editor]);

  const createUrlNode = useCallback((textNode: TextNode): UrlNode => {
    return $createUrlNode(textNode.getTextContent());
  }, []);

  const getUrlMatch = useCallback((text: string) => {
    const urls = findUrls(new TextEncoder().encode(text));
    if (urls.length < 1) {
      return null;
    }
    const [a] = urls[0];
    return {
      start: a[0],
      end: a[1],
    };
  }, []);

  useLexicalTextEntity<UrlNode>(getUrlMatch, UrlNode, createUrlNode);

  return (
    <NodeEventPlugin
      nodeType={UrlNode}
      eventType="click"
      eventListener={(_, editor, k) => {
        if (editor.isEditable()) return;
        editor.getEditorState().read(() => {
          const text = $getNodeByKey(k)?.getTextContent();
          if (text) {
            let url;
            try {
              url = new URL(text);
            } catch (err) {
              url = new URL("http://" + text);
            }
            WebApp.openLink(url.toString());
          }
        });
      }}
    />
  );
}
