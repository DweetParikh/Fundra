"use client";
import { useCallback, useState } from "react";
import { describeError } from "@/lib/errors";

/** Wraps a transaction-sending function with busy / error / signature state. */
export function useAction(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<string>) => {
      setBusy(true);
      setError(null);
      setSig(null);
      try {
        const s = await fn();
        setSig(s);
        onDone?.();
        return s;
      } catch (e) {
        setError(describeError(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  return { run, busy, error, sig };
}
