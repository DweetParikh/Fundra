"use client";
import Link from "next/link";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useCampaigns, type CampaignRow } from "@/hooks/useCampaigns";
import { usePolling } from "@/hooks/usePolling";
import type { MilestoneAccount } from "@/hooks/useCampaign";
import { milestonePda, vaultPda } from "@/lib/anchor/pdas";
import { formatAmount, trancheAmounts } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, MILESTONE_STATUS_LABEL, enumKey } from "@/lib/status";
import { Badge, Card, Empty, Notice, Stat } from "@/components/ui";

interface Extra {
  vaultBalance: bigint;
  milestone: MilestoneAccount | null;
}

/** Amount the maker can withdraw right now, mirroring the program's rules. */
function availableWithdrawal(row: CampaignRow, milestone: MilestoneAccount | null): BN {
  const c = row.account;
  const status = enumKey(c.status);
  const tranches = trancheAmounts(c.amountRaised, Array.from(c.milestonePercentages), c.milestoneCount);
  if (status === "funded" && c.currentMilestone === 0) return tranches[0];
  if (status === "milestones" && c.currentMilestone < c.milestoneCount && milestone && enumKey(milestone.status) === "approved" && !milestone.fundsClaimed) {
    return tranches[c.currentMilestone];
  }
  return new BN(0);
}

export default function MakerDashboard() {
  const { publicKey, connection, program } = useFundraProgram();
  const { data: rows, loading, error } = useCampaigns(publicKey, !!publicKey);

  const extra = usePolling<Record<string, Extra>>(
    async () => {
      if (!rows || rows.length === 0) return {};
      const infos = await connection.getMultipleAccountsInfo(rows.map((r) => vaultPda(r.address)));
      const milestones = await Promise.all(
        rows.map((r) => {
          const c = r.account;
          return c.currentMilestone > 0 && c.currentMilestone < c.milestoneCount
            ? program.account.milestone.fetchNullable(milestonePda(r.address, c.currentMilestone))
            : Promise.resolve(null);
        })
      );
      const out: Record<string, Extra> = {};
      rows.forEach((r, i) => {
        const info = infos[i];
        const bal = info && info.owner.equals(TOKEN_PROGRAM_ID) ? AccountLayout.decode(info.data.subarray(0, AccountLayout.span)).amount : 0n;
        out[r.address.toBase58()] = { vaultBalance: bal, milestone: milestones[i] };
      });
      return out;
    },
    [rows, program],
    20000,
    !!rows
  );

  if (!publicKey) return <Notice>Connect a Devnet wallet to see the campaigns you created.</Notice>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Maker dashboard</h1>
        <Link href="/create" className="btn btn-primary">New campaign</Link>
      </div>
      {loading && !rows && <p className="text-sm text-neutral-500">Loading your campaigns...</p>}
      {error && <Notice>Could not load campaigns: {error}</Notice>}
      {rows && rows.length === 0 && <Empty>You have not created any campaigns with this wallet.</Empty>}
      <div className="space-y-4">
        {rows?.map((r) => {
          const c = r.account;
          const d = c.decimals;
          const e = extra.data?.[r.address.toBase58()];
          const status = enumKey(c.status);
          const avail = availableWithdrawal(r, e?.milestone ?? null);
          const m = e?.milestone ?? null;
          const currentLabel =
            status === "completed"
              ? "All released"
              : status === "funded"
              ? "Milestone 1 (upfront)"
              : status === "milestones" && c.currentMilestone < c.milestoneCount
              ? `Milestone ${c.currentMilestone + 1}`
              : "Not started";
          return (
            <Card key={r.address.toBase58()}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/campaign/${r.address.toBase58()}`} className="text-base font-semibold text-white hover:underline">
                    {c.name || "Untitled campaign"}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">{c.contributorCount} contributors</p>
                </div>
                <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-5">
                <Stat label="Raised" value={formatAmount(c.amountRaised, d)} sub={`goal ${formatAmount(c.goal, d)}`} />
                <Stat label="Vault balance" value={e ? formatAmount(e.vaultBalance, d) : "-"} sub={`released ${formatAmount(c.fundsReleased, d)}`} />
                <Stat label="Current milestone" value={currentLabel} />
                <Stat
                  label="Submission"
                  value={m ? MILESTONE_STATUS_LABEL[enumKey(m.status)] : status === "milestones" ? "Not submitted" : "-"}
                  sub={m?.proofRef ? m.proofRef.slice(0, 22) : undefined}
                />
                <Stat label="Available to withdraw" value={formatAmount(avail, d)} />
              </div>
              <div className="mt-5">
                <Link href={`/campaign/${r.address.toBase58()}`} className="btn btn-ghost">
                  {status === "draft" ? "Review and activate" : avail.gtn(0) ? "Withdraw on campaign page" : "Manage campaign"}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
