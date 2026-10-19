"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCampaign } from "@/hooks/useCampaign";
import { usePosition } from "@/hooks/usePosition";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useNow } from "@/hooks/useNow";
import { AddressLink, Badge, Card, CopyText, Notice, ProgressBar, SectionTitle, Stat, StatTile, TxButton } from "@/components/ui";
import ContributePanel from "@/components/ContributePanel";
import MilestoneList from "@/components/MilestoneList";
import SecurityChecklist from "@/components/SecurityChecklist";
import { explorerAddress } from "@/lib/constants";
import { formatAmount, formatCountdown, formatDate, formatRewardRate, shortKey } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, enumKey } from "@/lib/status";
import { activateTx, claimRefundTx, claimRewardTx, finalizeCampaignTx } from "@/lib/tx";

const TABS = ["Overview", "Milestones", "Backers"] as const;

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { program, publicKey } = useFundraProgram();
  const { data: view, error, loading, refresh, valid } = useCampaign(id);
  const { data: pos, refresh: refreshPos } = usePosition(view?.address, view?.campaign.contributionMint);
  const now = useNow(1000);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const refreshAll = () => {
    refresh();
    refreshPos();
  };

  if (!valid) return <Notice>This is not a valid campaign address.</Notice>;
  if (loading && !view) return <p className="text-sm text-neutral-500">Loading campaign from Devnet...</p>;
  if (error && !view) return <Notice>Could not load this campaign: {error}</Notice>;
  if (!view) return <Notice>Campaign not found.</Notice>;

  const c = view.campaign;
  const d = c.decimals;
  const status = enumKey(c.status);
  const isMaker = !!publicKey && publicKey.equals(c.maker);
  const deadline = c.deadline.toNumber();
  const ended = now / 1000 >= deadline;
  const refs = { campaign: view.address, contributionMint: c.contributionMint, coreCollection: c.coreCollection };
  const position = pos?.position ?? null;
  const refundable = position ? position.amountContributed.sub(position.amountRefunded) : null;
  const claimable = position ? position.rewardEntitlement.sub(position.rewardClaimed) : null;
  const raised = Number(c.amountRaised.toString());
  const goal = Number(c.goal.toString());
  const max = Number(c.maxFunding.toString());

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="hover:text-white">Campaigns</Link>
        <span>/</span>
        <span className="text-neutral-300">{c.name || "Untitled"}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold tracking-tight text-white">{c.name || "Untitled campaign"}</h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-500">
            Maker <AddressLink address={c.maker.toBase58()} />
            {isMaker && <span className="ml-2 text-neutral-300">(you)</span>}
            {c.uri && (
              <a className="ml-4 underline underline-offset-4 hover:text-white" href={c.uri} target="_blank" rel="noreferrer">
                Metadata
              </a>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="pill">Token {shortKey(c.contributionMint)}</span>
            <span className="pill">Reward {formatRewardRate(c.rewardRateNumerator, c.rewardRateDenominator)}</span>
            <span className="pill">{c.milestoneCount} milestones</span>
          </div>
        </div>
        <div className="text-right">
          <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
          {status === "active" && (
            <div className="mt-3 text-xs text-neutral-500">
              Campaign ends in
              <div className="mt-0.5 text-lg font-semibold text-white">{ended ? "ended" : formatCountdown(deadline, now)}</div>
              <div className="mt-0.5 text-[11px]">{formatDate(deadline)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold text-white">
                  {formatAmount(c.amountRaised, d)}
                  <span className="text-base font-normal text-neutral-500"> / {formatAmount(c.maxFunding, d)}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">Goal {formatAmount(c.goal, d)} · {c.contributorCount} backers</div>
              </div>
              <div className="text-sm text-neutral-400">{raised ? Math.min(100, (raised / max) * 100).toFixed(0) : 0}% funded</div>
            </div>
            <div className="mt-5">
              <ProgressBar value={raised} max={max} marker={goal} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Reward rate" value={formatRewardRate(c.rewardRateNumerator, c.rewardRateDenominator)} sub={`Cap ${formatAmount(c.rewardSupplyCap, d)}`} />
              <StatTile label="Current milestone" value={`${c.currentMilestone} / ${c.milestoneCount}`} sub={CAMPAIGN_STATUS_LABEL[status]} />
              <StatTile label="In vault" value={formatAmount(view.vaultBalance, d)} sub={`Released ${formatAmount(c.fundsReleased, d)}`} />
              <StatTile label="Contribution token" value={shortKey(c.contributionMint)} sub={`${d} decimals`} />
            </div>
          </Card>

          <div className="flex gap-1.5">
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

          {tab === "Overview" && (
            <Card>
              <SectionTitle>About this campaign</SectionTitle>
              <p className="text-sm leading-relaxed text-neutral-400">
                Funds are held in a program-controlled vault. The founder receives each tranche only after the milestone is
                approved by contributors, and the goal and deadline are enforced on-chain. If the goal is not met, every
                contributor can claim a full refund.
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <SectionTitle>Contribution token</SectionTitle>
                  <div className="panel-sm p-4">
                    <div className="text-[11px] uppercase tracking-wider text-neutral-500">Mint address (Devnet)</div>
                    <CopyText text={c.contributionMint.toBase58()} className="mt-2 text-sm text-white" />
                    <a className="mt-2 inline-block text-xs text-neutral-500 underline underline-offset-4 hover:text-white" href={explorerAddress(c.contributionMint.toBase58())} target="_blank" rel="noreferrer">
                      View on Explorer
                    </a>
                  </div>
                </div>
                <div>
                  <SectionTitle>Key facts</SectionTitle>
                  <div className="grid grid-cols-2 gap-4">
                    <Stat label="Decimals" value={d} />
                    <Stat label="Token program" value="SPL Token" />
                    <Stat label="Freeze authority" value={view.contributionMint ? (view.contributionMint.freezeAuthority ? "Set" : "None") : "-"} />
                    <Stat label="Deadline" value={formatDate(deadline)} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {(tab === "Milestones" || tab === "Overview") && (
            <MilestoneList view={view} pos={pos ?? null} onDone={refreshAll} />
          )}

          {tab === "Backers" && (
            <Card>
              <SectionTitle>Backers</SectionTitle>
              <p className="text-sm text-neutral-400">
                {c.contributorCount} wallets have contributed. Individual positions are readable on-chain through the
                contributor accounts for this campaign.
              </p>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          {status === "draft" && (
            <Card>
              <SectionTitle>Activate</SectionTitle>
              {isMaker ? (
                <div className="space-y-4">
                  <Notice tone="warn">
                    Activation locks the goal, deadline, token, reward rate, supply cap, milestone split and maker address
                    permanently. Contributions open immediately.
                  </Notice>
                  <TxButton label="Activate campaign" className="w-full" run={() => activateTx(program, publicKey!, view.address)} onDone={refreshAll} />
                </div>
              ) : (
                <p className="text-sm text-neutral-500">This campaign is a draft and not open for contributions yet.</p>
              )}
            </Card>
          )}

          {status === "active" && !ended && <ContributePanel view={view} pos={pos ?? null} onDone={refreshAll} />}

          {status === "active" && ended && (
            <Card>
              <SectionTitle>Deadline reached</SectionTitle>
              <p className="mb-4 text-sm text-neutral-400">
                Funding is closed. Anyone can finalize: the campaign becomes Funded if the goal was met, otherwise Failed with refunds open.
              </p>
              {publicKey ? (
                <TxButton label="Finalize campaign" className="w-full" run={() => finalizeCampaignTx(program, publicKey, view.address)} onDone={refreshAll} />
              ) : (
                <p className="text-xs text-neutral-500">Connect a wallet to finalize.</p>
              )}
            </Card>
          )}

          {position && status !== "draft" && (
            <Card>
              <SectionTitle>Your position</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Contributed" value={formatAmount(position.amountContributed, d)} />
                <Stat label="Refunded" value={formatAmount(position.amountRefunded, d)} />
                <Stat label="Pending reward" value={formatAmount(claimable ?? 0, d)} sub={status === "completed" ? "Claimable now" : "After completion"} />
                <Stat label="Claimed reward" value={formatAmount(position.rewardClaimed, d)} />
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Receipt NFT <AddressLink address={position.receiptNft.toBase58()} />
              </p>
              <div className="mt-4 space-y-3">
                {status === "failed" && refundable && refundable.gtn(0) && (
                  <TxButton label={`Claim refund (${formatAmount(refundable, d)})`} className="w-full" run={() => claimRefundTx(program, publicKey!, refs)} onDone={refreshAll} />
                )}
                {status === "completed" && claimable && claimable.gtn(0) && (
                  <TxButton label="Claim reward" className="w-full" run={() => claimRewardTx(program, publicKey!, refs)} onDone={refreshAll} />
                )}
              </div>
            </Card>
          )}

          <SecurityChecklist view={view} />
        </aside>
      </div>
    </div>
  );
}
