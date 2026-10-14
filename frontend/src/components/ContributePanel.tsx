"use client";
import { useState } from "react";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import type { CampaignView } from "@/hooks/useCampaign";
import type { PositionView } from "@/hooks/usePosition";
import { formatAmount, parseAmount } from "@/lib/format";
import { contributeTx } from "@/lib/tx";
import { Card, Notice, SectionTitle, TxButton } from "./ui";

export default function ContributePanel({
  view,
  pos,
  onDone,
}: {
  view: CampaignView;
  pos: PositionView | null;
  onDone: () => void;
}) {
  const { program, publicKey } = useFundraProgram();
  const [amount, setAmount] = useState("");
  const c = view.campaign;
  const d = c.decimals;
  const base = parseAmount(amount, d);
  const remaining = c.maxFunding.sub(c.amountRaised);
  const balance = pos?.tokenBalance ?? 0n;

  let problem: string | null = null;
  if (!publicKey) problem = "Connect a wallet to contribute";
  else if (!base || base.isZero()) problem = "Enter an amount";
  else if (base.gt(remaining)) problem = "Exceeds the remaining capacity of this campaign";
  else if (BigInt(base.toString()) > balance) problem = "Exceeds your balance of this token";

  const pending = base
    ? (() => {
        const total = (pos?.position?.amountContributed ?? c.amountRaised.muln(0)).add(base);
        return total.mul(c.rewardRateNumerator).div(c.rewardRateDenominator);
      })()
    : null;

  return (
    <Card>
      <SectionTitle>Contribute</SectionTitle>
      <div className="mb-3 flex justify-between text-xs text-neutral-500">
        <span>Your balance: {formatAmount(balance, d)}</span>
        <span>Remaining capacity: {formatAmount(remaining, d)}</span>
      </div>
      <div className="flex gap-2">
        <input className="input" inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button
          className="btn btn-ghost"
          onClick={() => {
            const cap = BigInt(remaining.toString());
            setAmount(formatAmount(cap < balance ? cap : balance, d, d).replace(/,/g, ""));
          }}
        >
          Max
        </button>
      </div>
      <div className="mt-3 space-y-1 text-xs text-neutral-500">
        {pending && <p>Pending reward after this contribution: {formatAmount(pending, d)} (claimable only after completion).</p>}
        {!pos?.position && <p>Your first contribution mints a frozen, non-transferable receipt NFT to your wallet.</p>}
      </div>
      {problem && publicKey && amount && <div className="mt-3"><Notice>{problem}</Notice></div>}
      <div className="mt-4">
        <TxButton
          label="Contribute"
          disabled={!!problem}
          run={() => contributeTx(program, publicKey!, { campaign: view.address, contributionMint: c.contributionMint, coreCollection: c.coreCollection }, base!)}
          onDone={() => {
            setAmount("");
            onDone();
          }}
          className="w-full"
        />
      </div>
    </Card>
  );
}
