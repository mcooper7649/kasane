import { useCallback, useRef, useState } from "react";

/** Copy text and show a short-lived confirmation message. */
export function useCopy() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(null), 1800);
  }, []);

  const copy = useCallback(
    async (text: string, label = text) => {
      try {
        await navigator.clipboard.writeText(text);
        flash(`Copied ${label}`);
      } catch {
        flash("Copy blocked by the browser. Select the text and copy it manually.");
      }
    },
    [flash],
  );

  return { copy, flash, message };
}
