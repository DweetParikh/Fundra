"use client";
import { useEffect, useState } from "react";

/** Wall-clock milliseconds, refreshed on an interval, for countdowns and deadline-dependent buttons. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
