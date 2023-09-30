import ago from "js-ago";
import { loadNote, notesStore } from "../state";
import { Note } from "../types";

const DUMMY_NOTE = {
  id: "",
  createdAt: new Date(),
  title: ".",
  additionalText: ".",
};

function Entry({
  note: { id, additionalText, createdAt, updatedAt, title },
  isLoader,
}: {
  note: Note;
  isLoader?: boolean;
}) {
  return (
    <div
      className={`w-full p-4 border-b border-solid border-hint/25 text-left flex flex-col gap-2 select-none cursor-default ${
        isLoader ? "" : "active:bg-hint/25"
      }`}
      onClick={() => {
        if (isLoader) {
          return;
        }
        loadNote(id, false);
      }}
    >
      <div
        className={`flex items-center justify-between gap-1.5 ${
          isLoader ? "w-full bg-hint/25" : ""
        }`}
      >
        <div
          className={`text-lg overflow-hidden text-ellipsis whitespace-nowrap ${
            isLoader ? "opacity-0" : ""
          }`}
        >
          {title}
        </div>
        <div className={`text-xs text-hint/50 ${isLoader ? "opacity-0" : ""}`}>
          {ago(updatedAt ? new Date(updatedAt) : new Date(createdAt), {
            format: "short",
          })
            .replace("ago", "")
            .trim()}
        </div>
      </div>
      <div className={`text-hint ${isLoader ? "w-full bg-hint/25" : ""}`}>
        <div
          className={`overflow-hidden text-ellipsis whitespace-nowrap ${
            isLoader ? "opacity-0" : ""
          }`}
        >
          {additionalText}{" "}
        </div>
      </div>
    </div>
  );
}

const LOADER = Array(100).fill(<Entry isLoader={true} note={DUMMY_NOTE} />);

export function Notes() {
  const notes = notesStore((v) => v.notes);

  return (
    <div
      className={`flex items-center flex-col h-screen select-none ${
        notes === null ? "overflow-hidden animate-pulse" : ""
      }`}
    >
      {notes === null ? (
        LOADER
      ) : notes.length == 0 ? (
        <div className="text-sm text-hint flex items-center justify-center h-full">
          You don’t have any notes.
        </div>
      ) : (
        notes.map((note) => <Entry key={note.id} note={note} />)
      )}
    </div>
  );
}
