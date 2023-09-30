import { editorStore } from "../state";

export function Placeholder() {
  const editable = editorStore((v) => v.editable);
  return (
    <div
      className={`absolute text-xl top-2 left-3 events-none text-hint z-[-1] duration-100 ${
        editable ? "opacity-100" : "opacity-0"
      }`}
    >
      Note
    </div>
  );
}
