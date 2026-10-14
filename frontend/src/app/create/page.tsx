"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { parseMint, type MintInfo } from "@/hooks/useCampaign";
import { Card, Field, Notice, SectionTitle, TxButton } from "@/components/ui";
import { formatAmount, parseAmount } from "@/lib/format";
import { createCampaignTx } from "@/lib/tx";
import { platformConfigPda } from "@/lib/anchor/pdas";

const MAX_MILESTONES = 8; // mirrors MAX_MILESTONES in constants.rs
const MIN_LEAD_SECONDS = 120;

type MintState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; msg: string }
  | { kind: "ok"; info: MintInfo };

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function CreatePage() {
  const { program, connection, publicKey } = useFundraProgram();
  const router = useRouter();
  const created = useRef<PublicKey | null>(null);

  const [mintStr, setMintStr] = useState("");
  const [mint, setMint] = useState<MintState>({ kind: "idle" });
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [goal, setGoal] = useState("");
  const [max, setMax] = useState("");
  const [deadline, setDeadline] = useState(() => toLocalInput(new Date(Date.now() + 3 * 3600 * 1000)));
  const [rateNum, setRateNum] = useState("2");
  const [rateDen, setRateDen] = useState("1");
  const [pcts, setPcts] = useState<string[]>(["20", "30", "20", "30"]);

  // Validate the contribution mint against the program's rules before the user signs anything.
  useEffect(() => {
    if (!mintStr.trim()) return setMint({ kind: "idle" });
    let pk: PublicKey;
    try {
      pk = new PublicKey(mintStr.trim());
    } catch {
      return setMint({ kind: "error", msg: "Not a valid address" });
    }
    let dead = false;
    setMint({ kind: "checking" });
    const t = setTimeout(async () => {
      try {
        const acc = await connection.getAccountInfo(pk);
        if (dead) return;
        if (!acc) return setMint({ kind: "error", msg: "Account not found on Devnet" });
        if (acc.owner.equals(TOKEN_2022_PROGRAM_ID)) return setMint({ kind: "error", msg: "Token-2022 mints are not supported. Use a classic SPL Token mint." });
        if (!acc.owner.equals(TOKEN_PROGRAM_ID)) return setMint({ kind: "error", msg: "This account is not an SPL Token mint" });
        const info = parseMint(pk, acc);
        if (!info) return setMint({ kind: "error", msg: "This account is not a mint" });
        if (info.freezeAuthority) return setMint({ kind: "error", msg: "This mint has a freeze authority, which the program rejects" });
        setMint({ kind: "ok", info });
      } catch (e) {
        if (!dead) setMint({ kind: "error", msg: "Could not read the mint from Devnet" });
      }
    }, 400);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [mintStr, connection]);

  const decimals = mint.kind === "ok" ? mint.info.decimals : null;
  const goalBase = decimals !== null ? parseAmount(goal, decimals) : null;
  const maxBase = decimals !== null ? parseAmount(max, decimals) : null;
  const pctNums = pcts.map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : NaN));
  const pctSum = pctNums.reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0);
  const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
  const num = /^\d+$/.test(rateNum) ? parseInt(rateNum, 10) : NaN;
  const den = /^\d+$/.test(rateDen) ? parseInt(rateDen, 10) : NaN;

  const problems = useMemo(() => {
    const p: string[] = [];
    if (mint.kind !== "ok") p.push("Enter a valid classic SPL Token mint");
    if (!name.trim() || name.length > 32) p.push("Name is required (max 32 characters)");
    if (uri.length > 128) p.push("Metadata URI is too long (max 128 characters)");
    if (!goalBase || goalBase.isZero()) p.push("Goal must be greater than zero");
    if (!maxBase || (goalBase && maxBase.lt(goalBase))) p.push("Max funding must be at least the goal");
    if (!(deadlineUnix > Math.floor(Date.now() / 1000) + MIN_LEAD_SECONDS)) p.push("Deadline must be at least two minutes from now");
    if (!(num >= 0) || !(den > 0)) p.push("Reward rate needs a numerator (0 or more) and a non-zero denominator");
    if (pcts.length < 1 || pcts.length > MAX_MILESTONES || pctNums.some((n) => !(n > 0)) || pctSum !== 100) p.push("Milestone percentages must each be above zero and total exactly 100");
    return p;
  }, [mint, name, uri, goalBase, maxBase, deadlineUnix, num, den, pcts, pctNums, pctSum]);

  const rewardCap =
    maxBase && num >= 0 && den > 0 && decimals !== null
      ? formatAmount(maxBase.muln(num).divn(den), decimals)
      : null;

  async function submit(): Promise<string> {
    if (!publicKey) throw new Error("Connect a wallet first");
    if (mint.kind !== "ok" || !goalBase || !maxBase) throw new Error("Form is incomplete");
    if (!(await connection.getAccountInfo(platformConfigPda()))) {
      throw new Error("The platform is not initialized on this deployment. Run `anchor migrate` once, as described in the README.");
    }
    const { signature, campaign } = await createCampaignTx(program, publicKey, {
      name: name.trim(),
      uri: uri.trim(),
      contributionMint: mint.info.address,
      goal: goalBase,
      maxFunding: maxBase,
      deadline: deadlineUnix,
      rateNumerator: num,
      rateDenominator: den,
      percentages: pctNums,
    });
    created.current = campaign;
    return signature;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Create a campaign</h1>
        <p className="mt-2 text-sm text-neutral-400">
          The campaign is created as a draft. You review it and activate it on the next page; activation locks every
          term permanently.
        </p>
      </div>

      <Card>
        <SectionTitle>Contribution token</SectionTitle>
        <Field
          label="Devnet SPL token mint address"
          hint="Contributors pay in this one token. It is locked once the campaign is activated."
        >
          <input className="input font-mono" placeholder="Mint address" value={mintStr} onChange={(e) => setMintStr(e.target.value)} />
        </Field>
        <div className="mt-3 text-sm">
          {mint.kind === "checking" && <span className="text-neutral-500">Checking mint...</span>}
          {mint.kind === "error" && <span className="text-neutral-300">Error: {mint.msg}</span>}
          {mint.kind === "ok" && (
            <span className="text-neutral-300">
              Valid classic SPL Token mint. Decimals: {mint.info.decimals}. Supply: {formatAmount(mint.info.supply, mint.info.decimals)}. No freeze authority.
            </span>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Campaign</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="input" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          </Field>
          <Field label="Metadata URI" hint="Optional. Used for the receipt NFTs and collection.">
            <input className="input" maxLength={128} value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label={`Goal${decimals !== null ? "" : " (select a mint first)"}`} hint="Minimum raise. Below this, everyone is refunded.">
            <input className="input" inputMode="decimal" disabled={decimals === null} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="0.0" />
          </Field>
          <Field label="Max funding" hint="Contributions stop at this total.">
            <input className="input" inputMode="decimal" disabled={decimals === null} value={max} onChange={(e) => setMax(e.target.value)} placeholder="0.0" />
          </Field>
          <Field label="Deadline" hint="Local time. Funding closes here and the goal is evaluated.">
            <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle>Rewards</SectionTitle>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Field label="Rate numerator">
            <input className="input" inputMode="numeric" value={rateNum} onChange={(e) => setRateNum(e.target.value)} />
          </Field>
          <Field label="Rate denominator" hint="Reward tokens per 1 whole contribution token = numerator / denominator.">
            <input className="input" inputMode="numeric" value={rateDen} onChange={(e) => setRateDen(e.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Rewards are recorded as pending at contribution time and become claimable only after the campaign completes.
          {rewardCap && <> Supply cap: {rewardCap} reward tokens (max funding times rate).</>}
        </p>
      </Card>

      <Card>
        <SectionTitle
          right={
            <span className={`text-xs ${pctSum === 100 ? "text-neutral-300" : "text-neutral-500"}`}>Total {pctSum} / 100</span>
          }
        >
          Milestones
        </SectionTitle>
        <p className="mb-4 text-xs text-neutral-500">
          Milestone 1 is released to you without a vote once the campaign is funded. Every later milestone needs
          contributor approval.
        </p>
        <div className="space-y-2">
          {pcts.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-24 text-sm text-neutral-400">Milestone {i + 1}</span>
              <input
                className="input max-w-[140px]"
                inputMode="numeric"
                value={p}
                onChange={(e) => setPcts(pcts.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <span className="text-sm text-neutral-500">%</span>
              {pcts.length > 1 && (
                <button className="text-xs text-neutral-500 hover:text-white" onClick={() => setPcts(pcts.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {pcts.length < MAX_MILESTONES && (
          <button className="btn btn-ghost mt-4" onClick={() => setPcts([...pcts, "0"])}>
            Add milestone
          </button>
        )}
      </Card>

      {!publicKey && <Notice>Connect a Devnet wallet to create the campaign.</Notice>}
      {problems.length > 0 && (
        <Notice>
          <ul className="list-disc space-y-1 pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}
      <TxButton
        label="Create campaign (draft)"
        disabled={!publicKey || problems.length > 0}
        run={submit}
        onDone={() => created.current && router.push(`/campaign/${created.current.toBase58()}`)}
      />
    </div>
  );
}
