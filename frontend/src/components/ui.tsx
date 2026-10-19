"use client";
import { ReactNode, useState } from "react";
import { explorerAddress, explorerTx } from "@/lib/constants";
import { shortKey } from "@/lib/format";
import { useAction } from "@/hooks/useAction";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-6 sm:p-7 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-white">{children}</h2>
      {right}
    </div>
  );
}

const TONE: Record<string, string> = {
  active: "border-white/25 bg-white/[0.07] text-white",
  funded: "border-white/20 bg-white/[0.05] text-neutral-100",
  milestones: "border-white/20 bg-white/[0.05] text-neutral-100",
  completed: "border-white/30 bg-white text-black",
  failed: "border-neutral-700 bg-neutral-900 text-neutral-400",
  draft: "border-neutral-800 bg-transparent text-neutral-400",
  pending: "border-neutral-800 bg-transparent text-neutral-400",
  underReview: "border-white/25 bg-white/[0.07] text-white",
  approved: "border-white/30 bg-white text-black",
  rejected: "border-neutral-700 bg-neutral-900 text-neutral-400",
  released: "border-white/30 bg-white text-black",
};

export function Badge({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[kind] ?? TONE.draft}`}>
      {(kind === "active" || kind === "underReview") && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, marker }: { value: number; max: number; marker?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const mk = marker !== undefined && max > 0 ? Math.min(100, (marker / max) * 100) : undefined;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      {mk !== undefined && <div className="absolute -top-1 h-3.5 w-px bg-white/50" style={{ left: `${mk}%` }} />}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1.5 truncate text-[17px] font-semibold text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel-sm p-4">
      <Stat label={label} value={value} sub={sub} />
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
      <span className="mb-2 block text-xs text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-neutral-600">{hint}</span>}
    </label>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "warn" ? "border-white/20 bg-white/[0.05] text-neutral-200" : "border-white/[0.08] bg-white/[0.02] text-neutral-400"
      }`}
    >
      {children}
    </div>
  );
}

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
    <div className={`space-y-2 ${className}`}>
      <button
        className={`btn w-full sm:w-auto ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}
        disabled={disabled || busy}
        onClick={() => exec(run)}
      >
        {busy ? "Waiting for wallet..." : label}
      </button>
      {error && <p className="break-words text-xs text-neutral-400">Error: {error}</p>}
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
  return <div className="panel-sm p-10 text-center text-sm text-neutral-500">{children}</div>;
}
