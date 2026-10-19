"use client";
import { useState } from "react";
import Link from "next/link";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useContributorPositions, type PositionRow } from "@/hooks/useCampaigns";
import { AddressLink, Badge, Card, Empty, Notice, ProgressBar, SectionTitle, StatTile, TxButton } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, enumKey } from "@/lib/status";
import { claimRefundTx, claimRewardTx } from "@/lib/tx";

const TABS = ["Ongoing", "Completed", "Refunds", "My receipts"] as const;
type Tab = (typeof TABS)[number];

function inTab(tab: Tab, row: PositionRow): boolean {
  const status = row.campaign ? enumKey(row.campaign.status) : "";
  const refundable = row.account.amountContributed.gt(row.account.amountRefunded);
  if (tab === "Ongoing") return ["active", "funded", "milestones"].includes(status) && !(status === "failed");
  if (tab === "Completed") return status === "completed";
  if (tab === "Refunds") return status === "failed" && refundable;
  return true;
}

function votesSummary(row: PositionRow): string {
  const parts: string[] = [];
  const count = row.campaign?.milestoneCount ?? 0;
  for (let i = 0; i < count; i++) {
    const v = enumKey(row.account.votes[i]);
    if (v !== "none") parts.push(`M${i}: ${v === "approve" ? "approved" : "rejected"}`);
  }
  return parts.length ? parts.join(", ") : "No votes cast";
}

export default function ContributorDashboard() {
  const { publicKey, program } = useFundraProgram();
  const { data: rows, loading, error, refresh } = useContributorPositions(publicKey);
  const [tab, setTab] = useState<Tab>("Ongoing");

  if (!publicKey) return <Notice>Connect a Devnet wallet to see the campaigns you backed.</Notice>;

  const all = (rows ?? []).filter((r) => r.campaign);
  const committed = all.reduce((a, r) => a + Number(r.account.amountContributed.toString()), 0);
  const pending = all.reduce((a, r) => a + Number(r.account.rewardEntitlement.sub(r.account.rewardClaimed).toString()), 0);
  const claimed = all.reduce((a, r) => a + Number(r.account.rewardClaimed.toString()), 0);
  const refundable = all.reduce((a, r) => a + Number(r.account.amountContributed.sub(r.account.amountRefunded).toString()), 0);
  const decimals = all[0]?.campaign?.decimals ?? 0;
  const shown = all.filter((r) => inTab(tab, r));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-white">Contributor dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">Track the campaigns you back, your receipts, votes and refunds.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total committed" value={formatAmount(committed, decimals)} />
        <StatTile label="Backed campaigns" value={all.length} />
        <StatTile label="Pending rewards" value={formatAmount(pending, decimals)} sub="After completion" />
        <StatTile label="Claimed rewards" value={formatAmount(claimed, decimals)} sub={`Refunds available ${formatAmount(refundable, decimals)}`} />
      </div>

      {loading && !rows && <p className="text-sm text-neutral-500">Loading your positions...</p>}
      {error && <Notice>Could not load positions: {error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs transition ${tab === t ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {rows && shown.length === 0 && <Empty>Nothing in this view.</Empty>}

          {tab !== "My receipts" &&
            shown.map((r) => {
              const c = r.campaign!;
              const d = c.decimals;
              const status = enumKey(c.status);
              const p = r.account;
              const refundAmt = p.amountContributed.sub(p.amountRefunded);
              const pend = p.rewardEntitlement.sub(p.rewardClaimed);
              const refs = { campaign: p.campaign, contributionMint: c.contributionMint, coreCollection: c.coreCollection };
              return (
                <Card key={r.address.toBase58()}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/campaign/${p.campaign.toBase58()}`} className="text-base font-semibold text-white hover:underline">
                      {c.name || "Untitled campaign"}
                    </Link>
                    <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
                  </div>
                  <div className="mt-5">
                    <ProgressBar value={Number(c.amountRaised.toString())} max={Number(c.maxFunding.toString())} marker={Number(c.goal.toString())} />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div><div className="text-xs text-neutral-500">Contributed</div><div className="mt-1 text-sm font-semibold text-white">{formatAmount(p.amountContributed, d)}</div></div>
                    <div><div className="text-xs text-neutral-500">Pending reward</div><div className="mt-1 text-sm font-semibold text-white">{formatAmount(pend, d)}</div></div>
                    <div><div className="text-xs text-neutral-500">Claimed</div><div className="mt-1 text-sm font-semibold text-white">{formatAmount(p.rewardClaimed, d)}</div></div>
                    <div><div className="text-xs text-neutral-500">Votes</div><div className="mt-1 text-xs text-neutral-400">{votesSummary(r)}</div></div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {status === "failed" && refundAmt.gtn(0) && (
                      <TxButton label={`Claim refund (${formatAmount(refundAmt, d)})`} run={() => claimRefundTx(program, publicKey, refs)} onDone={refresh} />
                    )}
                    {status === "completed" && pend.gtn(0) && (
                      <TxButton label={`Claim reward (${formatAmount(pend, d)})`} run={() => claimRewardTx(program, publicKey, refs)} onDone={refresh} />
                    )}
                    {status === "milestones" && (
                      <Link href={`/campaign/${p.campaign.toBase58()}`} className="btn btn-ghost">Review and vote</Link>
                    )}
                  </div>
                </Card>
              );
            })}

          {tab === "My receipts" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {all.map((r) => (
                <Card key={r.address.toBase58()}>
                  <div className="text-sm font-semibold text-white">{r.campaign!.name || "Untitled"} receipt</div>
                  <p className="mt-1 text-xs text-neutral-500">Frozen, non-transferable Core NFT</p>
                  <div className="mt-4 text-xs text-neutral-500">Receipt address</div>
                  <div className="mt-1 break-all font-mono text-xs"><AddressLink address={r.account.receiptNft.toBase58()} /></div>
                </Card>
              ))}
              {all.length === 0 && <Empty>No receipts yet.</Empty>}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <SectionTitle>Your receipts ({all.length})</SectionTitle>
            <ul className="space-y-3">
              {all.slice(0, 5).map((r) => (
                <li key={r.address.toBase58()} className="panel-sm flex items-center justify-between p-3">
                  <span className="truncate text-sm text-white">{r.campaign!.name || "Untitled"}</span>
                  <span className="text-xs text-neutral-500">{formatAmount(r.account.amountContributed, r.campaign!.decimals)}</span>
                </li>
              ))}
              {all.length === 0 && <li className="text-xs text-neutral-500">No receipts yet.</li>}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
