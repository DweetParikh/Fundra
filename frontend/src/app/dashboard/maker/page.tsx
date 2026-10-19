"use client";
import { useState } from "react";
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
import { claimMilestoneFundsTx } from "@/lib/tx";
import { Badge, Card, Empty, Notice, ProgressBar, SectionTitle, StatTile, TxButton } from "@/components/ui";
import MakerRequestRelease from "@/components/MakerRequestRelease";

interface Extra {
  vaultBalance: bigint;
  milestone: MilestoneAccount | null;
}

/** What the maker can withdraw right now, mirroring the program's rules. */
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
  const { data: rows, loading, error, refresh } = useCampaigns(publicKey, !!publicKey);
  const [selected, setSelected] = useState<string | null>(null);

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

  const all = rows ?? [];
  const totalRaised = all.reduce((a, r) => a + Number(r.account.amountRaised.toString()), 0);
  const released = all.reduce((a, r) => a + Number(r.account.fundsReleased.toString()), 0);
  const vault = all.reduce((a, r) => a + Number(extra.data?.[r.address.toBase58()]?.vaultBalance.toString() ?? 0), 0);
  const decimals = all[0]?.account.decimals ?? 0;
  const focus = all.find((r) => r.address.toBase58() === selected) ?? all.find((r) => enumKey(r.account.status) !== "completed") ?? all[0];
  const focusExtra = focus ? extra.data?.[focus.address.toBase58()] : undefined;
  const focusAvail = focus ? availableWithdrawal(focus, focusExtra?.milestone ?? null) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">Maker dashboard</h1>
          <p className="mt-2 text-sm text-neutral-500">Manage your campaigns, submit milestone updates, and withdraw released funds.</p>
        </div>
        <Link href="/create" className="btn btn-primary">New campaign</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total raised" value={formatAmount(totalRaised, decimals)} />
        <StatTile label="Vault balance" value={formatAmount(vault, decimals)} sub="Across all campaigns" />
        <StatTile label="Funds released" value={formatAmount(released, decimals)} sub="To your wallet" />
        <StatTile label="Available withdrawal" value={focusAvail ? formatAmount(focusAvail, decimals) : "0"} sub={focus ? focus.account.name : "No campaign"} />
      </div>

      {loading && !rows && <p className="text-sm text-neutral-500">Loading your campaigns...</p>}
      {error && <Notice>Could not load campaigns: {error}</Notice>}
      {rows && rows.length === 0 && <Empty>You have not created any campaigns with this wallet.</Empty>}

      {focus && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr_1fr]">
          <Card>
            <SectionTitle>Your campaigns ({all.length})</SectionTitle>
            <div className="space-y-3">
              {all.map((r) => {
                const c = r.account;
                const status = enumKey(c.status);
                const active = focus.address.equals(r.address);
                return (
                  <button
                    key={r.address.toBase58()}
                    onClick={() => setSelected(r.address.toBase58())}
                    className={`panel-sm w-full p-4 text-left transition ${active ? "border-white/25 bg-white/[0.05]" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-white">{c.name || "Untitled"}</span>
                      <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-neutral-500">
                      <span>{formatAmount(c.amountRaised, c.decimals)} / {formatAmount(c.maxFunding, c.decimals)}</span>
                      <span>{c.contributorCount} backers</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={Number(c.amountRaised.toString())} max={Number(c.maxFunding.toString())} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle>Milestone submission</SectionTitle>
            <div className="space-y-4">
              <div className="panel-sm p-4">
                <div className="text-xs text-neutral-500">Campaign</div>
                <div className="mt-1 text-sm text-white">{focus.account.name || "Untitled"}</div>
                <div className="mt-3 text-xs text-neutral-500">Current milestone</div>
                <div className="mt-1 text-sm text-white">
                  {focus.account.currentMilestone < focus.account.milestoneCount
                    ? `Milestone ${focus.account.currentMilestone} · ${
                        focusExtra?.milestone ? MILESTONE_STATUS_LABEL[enumKey(focusExtra.milestone.status)] : "not submitted"
                      }`
                    : "All milestones released"}
                </div>
                {focusExtra?.milestone?.proofRef && (
                  <p className="mt-2 break-all font-mono text-[11px] text-neutral-500">Proof: {focusExtra.milestone.proofRef}</p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <MakerRequestRelease row={focus} onDone={refresh} />
            <Card>
              <SectionTitle>Withdraw</SectionTitle>
              <p className="mb-4 text-xs text-neutral-500">Withdraw the approved tranche directly to your token account.</p>
              {focusAvail && focusAvail.gtn(0) ? (
                <TxButton
                  label={`Withdraw ${formatAmount(focusAvail, focus.account.decimals)}`}
                  className="w-full"
                  run={() =>
                    claimMilestoneFundsTx(
                      program,
                      publicKey,
                      { campaign: focus.address, contributionMint: focus.account.contributionMint, coreCollection: focus.account.coreCollection },
                      focus.account.currentMilestone
                    )
                  }
                  onDone={refresh}
                />
              ) : (
                <Notice>Nothing available to withdraw right now.</Notice>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
