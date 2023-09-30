import { ContentEditable as ContentEditable_ } from "@lexical/react/LexicalContentEditable";
import { editorStore } from "../state";

export function ContentEditable() {
  const editable = editorStore((v) => v.editable);
  return <ContentEditable_ spellCheck={editable} className="text-xl h-full" />;
}
