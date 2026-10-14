/** Turns wallet / Anchor / RPC errors into a short readable message. */
export function describeError(e: unknown): string {
  const err = e as {
    error?: { errorMessage?: string; errorCode?: { code?: string } };
    message?: string;
    logs?: string[];
  };
  if (err?.error?.errorMessage) return err.error.errorMessage;
  const msg = err?.message ?? String(e);
  const m = msg.match(/Error Message: ([^.]+\.?)/);
  if (m) return m[1];
  if (/User rejected/i.test(msg)) return "Request rejected in wallet";
  if (/already in use/i.test(msg)) return "This account already exists (for example, the milestone was already submitted)";
  if (/insufficient/i.test(msg)) return "Insufficient funds for this transaction";
  return msg.length > 240 ? msg.slice(0, 240) + "..." : msg;
}
