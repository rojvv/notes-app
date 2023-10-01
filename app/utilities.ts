import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
} from "lexical";
import { $isAtNodeEnd } from "@lexical/selection";
import { $isLinkNode, LinkNode } from "@lexical/link";
import {
  $isMarkNode,
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from "@lexical/mark";

export const isMac = /macos|iphone|ipad|ipod/.test(
  navigator.userAgent.toLowerCase().replaceAll(" ", ""),
);

function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
  }
}
export function getSelectedLink(selection: RangeSelection) {
  const node = getSelectedNode(selection);
  if ($isLinkNode(node)) {
    return node;
  }
  const parent = node.getParent();
  if ($isLinkNode(parent)) {
    return parent;
  } else {
    return null;
  }
}
export function getSelectedMark(selection: RangeSelection) {
  const node = getSelectedNode(selection);
  if ($isMarkNode(node)) {
    return node;
  }
  const parent = node.getParent();
  if ($isMarkNode(parent)) {
    return parent;
  } else {
    return null;
  }
}
function collectLinksAndMarks(node: LexicalNode) {
  const linksAndMarks = new Array<MarkNode | LinkNode>();
  if ($isLinkNode(node)) {
    linksAndMarks.push(node);
  } else if ($isMarkNode(node)) {
    linksAndMarks.push(node);
  }
  if ($isElementNode(node)) {
    for (const c of node.getChildren()) {
      for (const m of collectLinksAndMarks(c)) {
        linksAndMarks.push(m);
      }
    }
  }
  return linksAndMarks;
}
export function getSelectedLinksAndMarks(selection: RangeSelection) {
  const linksAndMarks = new Array<MarkNode | LinkNode>();

  const anchorNode = $getNodeByKey(selection.anchor.key);
  const focusNode = $getNodeByKey(selection.focus.key);
  const nodes = [
    anchorNode,
    focusNode,
    ...((anchorNode != null && focusNode != null)
      ? anchorNode.getNodesBetween(focusNode)
      : []),
  ];
  for (const node of nodes) {
    if (node == null || $isTextNode(node)) {
      continue;
    }
    for (const m of collectLinksAndMarks(node)) {
      linksAndMarks.push(m);
    }
  }

  return linksAndMarks;
}

export function toggleSpoiler(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedMark(selection);
      if (node != null) {
        $unwrapMarkNode(node);
      } else {
        if (selection.hasFormat("code")) {
          selection.formatText("code");
        }
        $wrapSelectionInMarkNode(
          selection,
          selection.isBackward(),
          crypto.randomUUID(),
        );
      }
    }
  });
}
