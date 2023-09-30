import { useCallback, useEffect, useState } from "react";
import { WebApp } from "@grammyjs/web-app";
import { Editor } from "../components/Editor";
import { headers } from "../common";

async function update(id: string, state: string) {
  WebApp.enableClosingConfirmation();
  try {
    await fetch(`/notes/${id}`, { method: "POST", headers, body: state });
  } finally {
    WebApp.disableClosingConfirmation(); // TODO: retry
  }
}
  
export function Note({
  id,
  initialState,
}: {
  id: string;
  initialState: string;
}) {
  const [state, setState] = useState(initialState);
  const [timeout, setTimeout_] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearTimeout_ = useCallback(() => {
    if (timeout != null) {
      clearTimeout(timeout);
      setTimeout_(null);
    }
  }, [timeout]);

  useEffect(() => {
    if (state == "") {
      return;
    }
    clearTimeout_();
    setTimeout_(setTimeout(() => update(id, state), 2000));
  }, [state]);

  return (
    <Editor
      initialState={initialState}
      onChange={(state) => setState(JSON.stringify(state.toJSON()))}
    />
  );
}
