import { RangeSelection } from "lexical";
import { $isAtNodeEnd } from "@lexical/selection";
import { $isLinkNode } from "@lexical/link";

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
