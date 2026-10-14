"use client";
import { useParams } from "next/navigation";
import { useCampaign } from "@/hooks/useCampaign";
import { usePosition } from "@/hooks/usePosition";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useNow } from "@/hooks/useNow";
import { AddressLink, Badge, Card, CopyText, Notice, ProgressBar, SectionTitle, Stat, TxButton } from "@/components/ui";
import ContributePanel from "@/components/ContributePanel";
import MilestoneList from "@/components/MilestoneList";
import SecurityChecklist from "@/components/SecurityChecklist";
import { explorerAddress } from "@/lib/constants";
import { formatAmount, formatCountdown, formatDate, formatPercent, formatRewardRate } from "@/lib/format";
import { CAMPAIGN_STATUS_LABEL, enumKey } from "@/lib/status";
import { activateTx, claimRefundTx, claimRewardTx, finalizeCampaignTx } from "@/lib/tx";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { program, publicKey } = useFundraProgram();
  const { data: view, error, loading, refresh, valid } = useCampaign(id);
  const { data: pos, refresh: refreshPos } = usePosition(view?.address, view?.campaign.contributionMint);
  const now = useNow(1000);

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
  const raisedNum = Number(c.amountRaised.toString());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold text-white">{c.name || "Untitled campaign"}</h1>
            <Badge kind={status}>{CAMPAIGN_STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Maker <AddressLink address={c.maker.toBase58()} />
            {isMaker && <span className="ml-2 text-neutral-300">(you)</span>}
            {c.uri && (
              <>
                {" "}
                <a className="ml-3 underline underline-offset-4 hover:text-white" href={c.uri} target="_blank" rel="noreferrer">
                  Metadata
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Token info with the mint address up front */}
          <Card>
            <SectionTitle>Contribution token</SectionTitle>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Mint address (Devnet)</div>
              <CopyText text={c.contributionMint.toBase58()} className="mt-2 text-sm text-white" />
              <a
                className="mt-2 inline-block text-xs text-neutral-400 underline underline-offset-4 hover:text-white"
                href={explorerAddress(c.contributionMint.toBase58())}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer
              </a>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Decimals" value={d} />
              <Stat label="Token program" value="SPL Token" sub="Classic, not Token-2022" />
              <Stat
                label="Freeze authority"
                value={view.contributionMint ? (view.contributionMint.freezeAuthority ? "Set" : "None") : "-"}
              />
              <Stat label="Supply" value={view.contributionMint ? formatAmount(view.contributionMint.supply, d) : "-"} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Funding</SectionTitle>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-2xl font-semibold text-white">
                {formatAmount(c.amountRaised, d)}{" "}
                <span className="text-sm font-normal text-neutral-500">raised of {formatAmount(c.goal, d)} goal</span>
              </div>
              <div className="text-sm text-neutral-400">{formatPercent(raisedNum, Number(c.goal.toString()))} of goal</div>
            </div>
            <ProgressBar value={raisedNum} max={Number(c.maxFunding.toString())} marker={Number(c.goal.toString())} />
            <p className="mt-2 text-xs text-neutral-500">Marker shows the goal. Bar scale ends at max funding {formatAmount(c.maxFunding, d)}.</p>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Contributors" value={c.contributorCount} />
              <Stat
                label="Deadline"
                value={status === "active" ? formatCountdown(deadline, now) : formatDate(deadline)}
                sub={status === "active" ? formatDate(deadline) : undefined}
              />
              <Stat label="Reward rate" value={formatRewardRate(c.rewardRateNumerator, c.rewardRateDenominator)} sub={`Cap ${formatAmount(c.rewardSupplyCap, d)}`} />
              <Stat label="In vault" value={formatAmount(view.vaultBalance, d)} sub={`Released ${formatAmount(c.fundsReleased, d)}`} />
            </div>
          </Card>

          <MilestoneList view={view} pos={pos ?? null} onDone={refreshAll} />
        </div>

        <div className="space-y-6">
          {/* Lifecycle actions */}
          {status === "draft" && (
            <Card>
              <SectionTitle>Activate</SectionTitle>
              {isMaker ? (
                <div className="space-y-3">
                  <Notice tone="warn">
                    Activation locks the goal, deadline, token, reward rate, supply cap, milestone split and maker address
                    permanently. Contributions open immediately.
                  </Notice>
                  <TxButton label="Activate campaign" run={() => activateTx(program, publicKey!, view.address)} onDone={refreshAll} />
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
              <p className="mb-3 text-sm text-neutral-400">
                Funding is closed. Anyone can finalize: the campaign becomes Funded if the goal was met, otherwise Failed with refunds open.
              </p>
              {publicKey ? (
                <TxButton label="Finalize campaign" run={() => finalizeCampaignTx(program, publicKey, view.address)} onDone={refreshAll} />
              ) : (
                <p className="text-xs text-neutral-500">Connect a wallet to finalize.</p>
              )}
            </Card>
          )}

          {status === "failed" && position && refundable && refundable.gtn(0) && (
            <Card>
              <SectionTitle>Refund</SectionTitle>
              <p className="mb-3 text-sm text-neutral-400">
                The goal was not met. You can reclaim {formatAmount(refundable, d)} directly from the vault.
              </p>
              <TxButton label="Claim refund" run={() => claimRefundTx(program, publicKey!, refs)} onDone={refreshAll} />
            </Card>
          )}

          {position && status !== "draft" && (
            <Card>
              <SectionTitle>Your position</SectionTitle>
              <div className="grid grid-cols-2 gap-5">
                <Stat label="Contributed" value={formatAmount(position.amountContributed, d)} />
                <Stat label="Refunded" value={formatAmount(position.amountRefunded, d)} />
                <Stat label="Pending reward" value={formatAmount(claimable ?? 0, d)} sub={status === "completed" ? "Claimable now" : "Claimable after completion"} />
                <Stat label="Claimed reward" value={formatAmount(position.rewardClaimed, d)} />
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Receipt NFT: <AddressLink address={position.receiptNft.toBase58()} />
              </p>
              {status === "completed" && claimable && claimable.gtn(0) && (
                <div className="mt-4">
                  <TxButton label="Claim reward" run={() => claimRewardTx(program, publicKey!, refs)} onDone={refreshAll} />
                </div>
              )}
            </Card>
          )}

          <SecurityChecklist view={view} />

          <Card>
            <SectionTitle>On-chain addresses</SectionTitle>
            <dl className="space-y-3 text-xs">
              {[
                ["Campaign", view.address.toBase58()],
                ["Vault", view.vault.toBase58()],
                ["Vault authority (PDA)", view.vaultAuthority.toBase58()],
                ["Reward mint (PDA)", view.rewardMintPda.toBase58()],
                ["Receipt collection", c.coreCollection.toBase58()],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="mt-0.5">
                    <CopyText text={v} display={`${v.slice(0, 10)}...${v.slice(-8)}`} />
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
