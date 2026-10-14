"use client";
import Link from "next/link";
import { formatAmount, formatCountdown, formatRewardRate, shortKey } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, enumKey } from "@/lib/status";
import type { CampaignRow } from "@/hooks/useCampaigns";
import { Badge, ProgressBar } from "./ui";
import { useNow } from "@/hooks/useNow";

export default function CampaignCard({ row }: { row: CampaignRow }) {
  const c = row.account;
  const now = useNow(1000);
  const status = enumKey(c.status);
  return (
    <Link href={`/campaign/${row.address.toBase58()}`} className="glass block p-5 transition hover:border-white/25 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{c.name || "Untitled campaign"}</h3>
          <p className="mt-0.5 font-mono text-xs text-neutral-500">Token {shortKey(c.contributionMint)}</p>
        </div>
        <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-white">{formatAmount(c.amountRaised, c.decimals)}</span>
          <span className="text-neutral-500">goal {formatAmount(c.goal, c.decimals)}</span>
        </div>
        <ProgressBar value={Number(c.amountRaised.toString())} max={Number(c.maxFunding.toString())} marker={Number(c.goal.toString())} />
      </div>
      <div className="mt-4 flex justify-between text-xs text-neutral-500">
        <span>{formatRewardRate(c.rewardRateNumerator, c.rewardRateDenominator)}</span>
        <span>{status === "active" ? formatCountdown(c.deadline.toNumber(), now) : `${c.milestoneCount} milestones`}</span>
      </div>
    </Link>
  );
}
