"use client";
import Link from "next/link";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useContributorPositions, type PositionRow } from "@/hooks/useCampaigns";
import { AddressLink, Badge, Card, Empty, Notice, Stat, TxButton } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, enumKey } from "@/lib/status";
import { claimRefundTx, claimRewardTx } from "@/lib/tx";

function votesSummary(row: PositionRow): string {
  const parts: string[] = [];
  const count = row.campaign?.milestoneCount ?? 0;
  for (let i = 0; i < count; i++) {
    const v = enumKey(row.account.votes[i]);
    if (v !== "none") parts.push(`M${i + 1}: ${v === "approve" ? "approved" : "rejected"}`);
  }
  return parts.length ? parts.join(", ") : "No votes cast";
}

export default function ContributorDashboard() {
  const { publicKey, program } = useFundraProgram();
  const { data: rows, loading, error, refresh } = useContributorPositions(publicKey);

  if (!publicKey) return <Notice>Connect a Devnet wallet to see the campaigns you backed.</Notice>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Contributor dashboard</h1>
      {loading && !rows && <p className="text-sm text-neutral-500">Loading your positions...</p>}
      {error && <Notice>Could not load positions: {error}</Notice>}
      {rows && rows.length === 0 && <Empty>This wallet has not backed any campaigns yet.</Empty>}
      <div className="space-y-4">
        {rows?.map((r) => {
          const c = r.campaign;
          if (!c) return null;
          const d = c.decimals;
          const status = enumKey(c.status);
          const p = r.account;
          const refundable = p.amountContributed.sub(p.amountRefunded);
          const pending = p.rewardEntitlement.sub(p.rewardClaimed);
          const refs = { campaign: p.campaign, contributionMint: c.contributionMint, coreCollection: c.coreCollection };
          return (
            <Card key={r.address.toBase58()}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/campaign/${p.campaign.toBase58()}`} className="text-base font-semibold text-white hover:underline">
                  {c.name || "Untitled campaign"}
                </Link>
                <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
                <Stat label="Contributed" value={formatAmount(p.amountContributed, d)} />
                <Stat label="Refunded" value={formatAmount(p.amountRefunded, d)} />
                <Stat label="Pending reward" value={formatAmount(pending, d)} sub={status === "completed" ? "Claimable now" : "After completion"} />
                <Stat label="Claimed reward" value={formatAmount(p.rewardClaimed, d)} />
              </div>
              <div className="mt-4 space-y-1 text-xs text-neutral-500">
                <p>
                  Receipt NFT: <AddressLink address={p.receiptNft.toBase58()} />
                </p>
                <p>Votes: {votesSummary(r)}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {status === "failed" && refundable.gtn(0) && (
                  <TxButton label={`Claim refund (${formatAmount(refundable, d)})`} run={() => claimRefundTx(program, publicKey, refs)} onDone={refresh} />
                )}
                {status === "completed" && pending.gtn(0) && (
                  <TxButton label={`Claim reward (${formatAmount(pending, d)})`} run={() => claimRewardTx(program, publicKey, refs)} onDone={refresh} />
                )}
                {status === "milestones" && (
                  <Link href={`/campaign/${p.campaign.toBase58()}`} className="btn btn-ghost">Review and vote</Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
