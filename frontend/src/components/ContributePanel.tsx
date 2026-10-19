"use client";
import { useState } from "react";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import type { CampaignView } from "@/hooks/useCampaign";
import type { PositionView } from "@/hooks/usePosition";
import { formatAmount, parseAmount } from "@/lib/format";
import { contributeTx } from "@/lib/tx";
import { Card, SectionTitle, TxButton } from "./ui";

export default function ContributePanel({ view, pos, onDone }: { view: CampaignView; pos: PositionView | null; onDone: () => void }) {
  const { program, publicKey } = useFundraProgram();
  const [amount, setAmount] = useState("");
  const c = view.campaign;
  const d = c.decimals;
  const base = parseAmount(amount, d);
  const remaining = c.maxFunding.sub(c.amountRaised);
  const balance = pos?.tokenBalance ?? 0n;

  let problem: string | null = null;
  if (!publicKey) problem = null;
  else if (!base || base.isZero()) problem = null;
  else if (base.gt(remaining)) problem = "Exceeds the remaining capacity";
  else if (BigInt(base.toString()) > balance) problem = "Exceeds your balance";

  const reward = base
    ? (pos?.position?.amountContributed ?? c.amountRaised.muln(0)).add(base).mul(c.rewardRateNumerator).div(c.rewardRateDenominator)
    : null;

  return (
    <Card>
      <SectionTitle>Contribute to this campaign</SectionTitle>
      <div className="panel-sm p-3.5">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
          <span>Amount</span>
          <span>Balance: {formatAmount(balance, d)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder-neutral-700"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="pill hover:text-white"
            onClick={() => {
              const cap = BigInt(remaining.toString());
              setAmount(formatAmount(cap < balance ? cap : balance, d, d).replace(/,/g, ""));
            }}
          >
            Max
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs text-neutral-500">
        {reward && <p>You will accrue {formatAmount(reward, d)} reward tokens, claimable after completion.</p>}
        {!pos?.position && <p>Your first contribution mints a frozen receipt NFT, non-transferable.</p>}
        {problem && <p className="text-neutral-300">{problem}</p>}
      </div>
      <div className="mt-5">
        {publicKey ? (
          <TxButton
            label="Contribute"
            className="w-full"
            disabled={!base || base.isZero() || !!problem}
            run={() => contributeTx(program, publicKey, { campaign: view.address, contributionMint: c.contributionMint, coreCollection: c.coreCollection }, base!)}
            onDone={() => {
              setAmount("");
              onDone();
            }}
          />
        ) : (
          <p className="text-center text-sm text-neutral-500">Connect a wallet to contribute</p>
        )}
      </div>
    </Card>
  );
}
