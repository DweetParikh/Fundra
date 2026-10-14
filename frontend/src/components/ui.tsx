"use client";
import { ReactNode, useState } from "react";
import { explorerAddress, explorerTx } from "@/lib/constants";
import { shortKey } from "@/lib/format";
import { useAction } from "@/hooks/useAction";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">{children}</h2>
      {right}
    </div>
  );
}

const BADGE: Record<string, string> = {
  active: "border-white/40 bg-white/10 text-white",
  funded: "border-neutral-300/40 bg-neutral-300/10 text-neutral-100",
  milestones: "border-neutral-300/40 bg-neutral-300/10 text-neutral-100",
  completed: "border-white/60 bg-white text-black",
  failed: "border-neutral-600 bg-neutral-800 text-neutral-400",
  draft: "border-neutral-700 bg-transparent text-neutral-400",
  pending: "border-neutral-700 bg-transparent text-neutral-400",
  underReview: "border-white/40 bg-white/10 text-white",
  approved: "border-white/60 bg-white text-black",
  rejected: "border-neutral-600 bg-neutral-800 text-neutral-400",
  released: "border-white/60 bg-white text-black",
};

export function Badge({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[kind] ?? BADGE.draft}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, marker }: { value: number; max: number; marker?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const mk = marker !== undefined && max > 0 ? Math.min(100, (marker / max) * 100) : undefined;
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-neutral-400 to-white" style={{ width: `${pct}%` }} />
      {mk !== undefined && <div className="absolute top-0 h-full w-px bg-white/70" style={{ left: `${mk}%` }} />}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function CopyText({ text, display, className = "" }: { text: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`group inline-flex items-center gap-2 font-mono text-xs text-neutral-300 hover:text-white ${className}`}
      title="Copy"
    >
      <span className="break-all text-left">{display ?? text}</span>
      <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-neutral-500 group-hover:text-neutral-200">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}

export function AddressLink({ address, label }: { address: string; label?: string }) {
  return (
    <a
      href={explorerAddress(address)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-neutral-300 underline decoration-white/20 underline-offset-4 hover:text-white"
    >
      {label ?? shortKey(address)}
    </a>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "warn" ? "border-white/25 bg-white/[0.06] text-neutral-200" : "border-white/10 bg-white/[0.03] text-neutral-400"
      }`}
    >
      {children}
    </div>
  );
}

/** Button that runs a transaction-sending function and shows busy / error / signature state. */
export function TxButton({
  label,
  run,
  onDone,
  variant = "primary",
  disabled,
  className = "",
}: {
  label: string;
  run: () => Promise<string>;
  onDone?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const { run: exec, busy, error, sig } = useAction(onDone);
  return (
    <div className="space-y-1.5">
      <button
        className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`}
        disabled={disabled || busy}
        onClick={() => exec(run)}
      >
        {busy ? "Waiting for wallet..." : label}
      </button>
      {error && <p className="break-words border-l-2 border-neutral-500 pl-2 text-xs text-neutral-400">Error: {error}</p>}
      {sig && (
        <p className="text-xs text-neutral-500">
          Confirmed.{" "}
          <a className="underline underline-offset-2 hover:text-white" href={explorerTx(sig)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        </p>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-500">{children}</div>;
}
