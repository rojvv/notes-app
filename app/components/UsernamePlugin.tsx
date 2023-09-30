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
import { findMentions } from "../lib/pmodes/match";
import { WebApp } from "@grammyjs/web-app";

export class UsernameNode extends TextNode {
  static importJSON(serializedNode: SerializedTextNode): UsernameNode {
    const node = $createUsernameNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  static getType(): string {
    return "username";
  }

  static clone(node: UsernameNode): UsernameNode {
    return new UsernameNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.username);
    return element;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "username",
    };
  }

  isTextEntity(): true {
    return true;
  }
}

function $createUsernameNode(text = ""): UsernameNode {
  return $applyNodeReplacement(new UsernameNode(text));
}

export function UsernamePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([UsernameNode])) {
      throw new Error("UsernameNode: UsernameNode not registered on editor");
    }
  }, [editor]);

  const createUsernameNode = useCallback((textNode: TextNode): UsernameNode => {
    return $createUsernameNode(textNode.getTextContent());
  }, []);

  const getUsernameMatch = useCallback((text: string) => {
    const username = findMentions(new TextEncoder().encode(text));
    if (username.length < 1) {
      return null;
    }
    return {
      start: username[0][0],
      end: username[0][1],
    };
  }, []);

  useLexicalTextEntity<UsernameNode>(
    getUsernameMatch,
    UsernameNode,
    createUsernameNode
  );

  return (
    <NodeEventPlugin
      nodeType={UsernameNode}
      eventType="click"
      eventListener={(_, editor, k) => {
        if (editor.isEditable()) return;
        editor.getEditorState().read(() => {
          const text = $getNodeByKey(k)?.getTextContent();
          if (text) {
            WebApp.openLink(`https://${text}.t.me`);
          }
        });
      }}
    />
  );
}
