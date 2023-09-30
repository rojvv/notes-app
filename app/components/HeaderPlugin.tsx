import { editorStore } from "../state";

const o =
  "duration-200 linear content-[''] absolute h-[2px] left-0 bottom-0 overflow-hidden";
const C =
  "py-2 px-2 w-full text-center relative overflow-hidden flex items-center justify-center " +
  `before:(${o} bg-hint/25 w-full) ` +
  `after:(${o} bg-button w-full)`;

export function HeaderPlugin() {
  const editable = editorStore((v) => v.editable);

  return (
    <div className="flex z-[300] select-none cursor-default">
      <div
        className={C + " " + (!editable ? "" : "after:translate-x-[100%]")}
        onClick={() => editorStore.setState({ editable: false })}
      >
        View
      </div>
      <div
        className={C + " " + (editable ? "" : "after:translate-x-[-100%]")}
        onClick={() => editorStore.setState({ editable: true })}
      >
        Edit
      </div>
    </div>
  );
}
