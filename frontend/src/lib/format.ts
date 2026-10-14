import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

type Amount = BN | bigint | number | string;

const toBig = (v: Amount): bigint => (BN.isBN(v) ? BigInt((v as BN).toString()) : BigInt(v as string | number | bigint));

/** Base units -> display string, using the mint's decimals. Trims trailing zeros. */
export function formatAmount(base: Amount, decimals: number, maxFraction = 6): string {
  const v = toBig(base);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const div = 10n ** BigInt(decimals);
  const whole = abs / div;
  let frac = (abs % div).toString().padStart(decimals, "0");
  frac = frac.slice(0, maxFraction).replace(/0+$/, "");
  const w = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${w}${frac ? "." + frac : ""}`;
}

/** Display string -> base units. Returns null for invalid or over-precise input. */
export function parseAmount(input: string, decimals: number): BN | null {
  const s = input.trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null;
  const [w, f = ""] = s.split(".");
  if (f.length > decimals) return null;
  const base = BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0") || "0");
  return new BN(base.toString());
}

export const shortKey = (k: PublicKey | string, n = 4) => {
  const s = typeof k === "string" ? k : k.toBase58();
  return `${s.slice(0, n)}...${s.slice(-n)}`;
};

export const formatPercent = (num: number, den: number) => (den === 0 ? "0%" : `${Math.min(100, (num / den) * 100).toFixed(1)}%`);

export const formatDate = (unix: number) =>
  new Date(unix * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatCountdown(unixTarget: number, nowMs = Date.now()): string {
  let s = Math.floor(unixTarget - nowMs / 1000);
  if (s <= 0) return "ended";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${s - m * 60}s left`;
}

/** Reward rate shown as "X reward tokens per 1 contribution token". */
export function formatRewardRate(num: BN, den: BN): string {
  if (num.isZero()) return "No reward";
  const n = Number(num.toString());
  const d = Number(den.toString());
  const r = n / d;
  return `${Number.isInteger(r) ? r : r.toFixed(4)} reward per 1 token`;
}

/** Mirrors Campaign::tranche_amount in the program: last tranche takes the rounding remainder. */
export function trancheAmounts(raised: BN, percentages: number[], count: number): BN[] {
  const out: BN[] = [];
  let sum = new BN(0);
  for (let i = 0; i < count; i++) {
    if (i === count - 1) out.push(raised.sub(sum));
    else {
      const t = raised.mul(new BN(percentages[i])).div(new BN(100));
      out.push(t);
      sum = sum.add(t);
    }
  }
  return out;
}
