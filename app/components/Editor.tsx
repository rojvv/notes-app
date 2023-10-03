import { EditorState } from "lexical";
import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { MarkNode } from "@lexical/mark";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { UsernamePlugin, UsernameNode } from "./UsernamePlugin";
import { ContentEditable } from "./ContentEditable";
import { CashtagNode, CashtagPlugin } from "./CashtagPlugin";
import { HashtagNode, HashtagPlugin } from "./HashtagPlugin";
import { TgUrlNode, TgUrlPlugin } from "./TgUrlPlugin";
import { MaxLengthPlugin } from "./MaxLengthPlugin";
import { UrlNode, UrlPlugin } from "./UrlPlugin";
import { HeaderPlugin } from "./HeaderPlugin";
import { ShortcutsPlugin } from "./ShortcutsPlugin";
import { AutoFocusPlugin } from "./AutoFocusPlugin";
import { ToolbarPlugin } from "./ToolbarPlugin";
import { StyleNeutralizerPlugin } from "./StyleNeutralizerPlugin";
import { StateSyncPlugin } from "./StateSyncPlugin";
import { editorStore } from "../state";
import { LinkDialog } from "./LinkDialog";
import { HelpDialog } from "./HelpDialog";

export function Editor({
  onChange,
}: {
  initialState: string;
  onChange: (state: EditorState) => void;
}) {
  const editable = editorStore((v) => v.editable);
  const initialConfig: InitialConfigType = {
    namespace: "NoteEditor",
    theme: {
      hashtag: "[&:not(code)]:text-link",
      username: "[&:not(code)]:text-link",
      cashtag: "[&:not(code)]:text-link",
      url: "[&:not(code)]:text-link",
      tgurl: "[&:not(code)]:text-link",
      link: "[&:not(code)]:text-link",
      mark: "bg-text/10 text-text",
      text: {
        bold: "bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "font-mono text-lg",
        underlineStrikethrough: "__underlineStrikethrough",
      },
    },
    onError: (a) => console.error("Editor error:", a),
    editable,
    nodes: [
      HashtagNode,
      UsernameNode,
      CodeNode,
      CashtagNode,
      UrlNode,
      TgUrlNode,
      LinkNode,
      MarkNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex h-full flex-col w-full">
        <div className="sticky top-0 bg-bg/50 backdrop-blur-md z-[400]">
          <HeaderPlugin />
          <ToolbarPlugin />
        </div>
        <div className="relative px-3 pt-2 h-full">
          <RichTextPlugin
            contentEditable={<ContentEditable />} // TODO: remove completely?
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <OnChangePlugin
          onChange={(state) => {
            onChange(state);
          }}
        />
        <HelpDialog />
        <LinkDialog />
        <LinkPlugin />
        <StateSyncPlugin />
        <ShortcutsPlugin />
        <StyleNeutralizerPlugin />
        <AutoFocusPlugin />
        <HistoryPlugin />
        <MaxLengthPlugin maxLength={4096} />
        <HashtagPlugin />
        <UsernamePlugin />
        <CashtagPlugin />
        <UrlPlugin />
        <TgUrlPlugin />
      </div>
    </LexicalComposer>
  );
}
