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
  const raised = Number(c.amountRaised.toString());
  const goal = Number(c.goal.toString());
  return (
    <Link
      href={`/campaign/${row.address.toBase58()}`}
      className="panel block p-5 transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-gradient-to-br from-white/15 to-white/[0.02]" />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-white">{c.name || "Untitled campaign"}</h3>
            <p className="mt-0.5 font-mono text-xs text-neutral-500">Token {shortKey(c.contributionMint)}</p>
          </div>
        </div>
        <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
      </div>

      <div className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-white">{formatAmount(c.amountRaised, c.decimals)}</span>
          <span className="text-xs text-neutral-500">
            of {formatAmount(c.maxFunding, c.decimals)}
          </span>
        </div>
        <ProgressBar value={raised} max={Number(c.maxFunding.toString())} marker={goal} />
        <div className="mt-2.5 flex justify-between text-xs text-neutral-500">
          <span>{c.contributorCount} backers</span>
          <span>{status === "active" ? formatCountdown(c.deadline.toNumber(), now) : `${c.milestoneCount} milestones`}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-neutral-500">
        <span>Reward {formatRewardRate(c.rewardRateNumerator, c.rewardRateDenominator)}</span>
        <span className="text-neutral-300">View campaign</span>
      </div>
    </Link>
  );
}
