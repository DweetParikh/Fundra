"use client";
import { useState } from "react";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useNow } from "@/hooks/useNow";
import type { CampaignView } from "@/hooks/useCampaign";
import type { PositionView } from "@/hooks/usePosition";
import { formatAmount, formatCountdown, trancheAmounts } from "@/lib/format";
import { MILESTONE_STATUS_LABEL, enumKey } from "@/lib/status";
import { claimMilestoneFundsTx, completeCampaignTx, finalizeMilestoneTx, submitMilestoneTx, voteTx } from "@/lib/tx";
import { Badge, Card, Notice, SectionTitle, TxButton } from "./ui";

const QUORUM_PCT = 20;

/** Milestone numbering follows the program: index 0 is the upfront tranche, shown as "Milestone 0". */
export default function MilestoneList({ view, pos, onDone }: { view: CampaignView; pos: PositionView | null; onDone: () => void }) {
  const { program, publicKey } = useFundraProgram();
  const now = useNow(1000);
  const [proof, setProof] = useState("");
  const c = view.campaign;
  const d = c.decimals;
  const status = enumKey(c.status);
  const isMaker = !!publicKey && publicKey.equals(c.maker);
  const refs = { campaign: view.address, contributionMint: c.contributionMint, coreCollection: c.coreCollection };
  const tranches = trancheAmounts(c.amountRaised, Array.from(c.milestonePercentages), c.milestoneCount);
  const position = pos?.position ?? null;
  const live = status === "funded" || status === "milestones" || status === "completed";

  return (
    <Card>
      <SectionTitle>Milestones</SectionTitle>
      {!live && <p className="-mt-2 mb-5 text-xs text-neutral-500">Planned release schedule. Nothing is released until the campaign is funded.</p>}
      <ol className="relative space-y-4">
        {Array.from({ length: c.milestoneCount }, (_, i) => {
          const m = view.milestones[i] ?? null;
          const released = i < c.currentMilestone;
          const isCurrent = live && i === c.currentMilestone && status !== "completed";
          const mKey = m ? enumKey(m.status) : "pending";
          const badgeKind = released ? "released" : i === 0 && status === "funded" ? "approved" : mKey;
          const label = released
            ? "Released"
            : i === 0 && status === "funded"
            ? "Ready to claim"
            : MILESTONE_STATUS_LABEL[mKey];
          const approve = m ? Number(m.approveWeight.toString()) : 0;
          const reject = m ? Number(m.rejectWeight.toString()) : 0;
          const raised = Number(c.amountRaised.toString());
          const cast = approve + reject;
          const vote = position ? enumKey(position.votes[i]) : "none";

          return (
            <li key={i} className="panel-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-neutral-300">
                    {i}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      Milestone {i} {i === 0 && <span className="font-normal text-neutral-500">(upfront, no vote)</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {c.milestonePercentages[i]}% of raised · {formatAmount(tranches[i], d)}
                    </div>
                    {m?.proofRef && <p className="mt-2 break-all font-mono text-[11px] text-neutral-500">Proof: {m.proofRef}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge kind={badgeKind}>{label}</Badge>
                  {released && <span className="text-xs text-neutral-500">{formatAmount(tranches[i], d)}</span>}
                </div>
              </div>

              {m && mKey === "underReview" && (
                <p className="mt-3 text-xs text-neutral-500">
                  Approve {formatAmount(m.approveWeight, d)} · Reject {formatAmount(m.rejectWeight, d)} · cast{" "}
                  {raised ? ((cast / raised) * 100).toFixed(1) : "0"}% of raised (quorum {QUORUM_PCT}%). Voting{" "}
                  {formatCountdown(m.votingDeadline.toNumber(), now)}.
                </p>
              )}

              {isCurrent && (
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  {i === 0 && status === "funded" &&
                    (isMaker ? (
                      <TxButton label="Claim upfront tranche" run={() => claimMilestoneFundsTx(program, publicKey!, refs, 0)} onDone={onDone} />
                    ) : (
                      <p className="text-xs text-neutral-500">Waiting for the maker to claim the upfront tranche.</p>
                    ))}

                  {i > 0 && status === "milestones" && !m &&
                    (isMaker ? (
                      <div className="w-full space-y-2">
                        <input
                          className="input font-mono text-xs"
                          maxLength={128}
                          placeholder="Proof reference (URL, IPFS CID or GitHub)"
                          value={proof}
                          onChange={(e) => setProof(e.target.value)}
                        />
                        <TxButton
                          label="Submit for review"
                          disabled={!proof.trim()}
                          run={() => submitMilestoneTx(program, publicKey!, view.address, i, proof.trim())}
                          onDone={() => {
                            setProof("");
                            onDone();
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">Waiting for the maker to submit proof.</p>
                    ))}

                  {m && mKey === "underReview" && (
                    <>
                      {position && vote === "none" && position.amountContributed.gt(position.amountRefunded) && now / 1000 < m.votingDeadline.toNumber() && (
                        <>
                          <TxButton label="Approve" run={() => voteTx(program, publicKey!, view.address, i, true)} onDone={onDone} />
                          <TxButton label="Reject" variant="ghost" run={() => voteTx(program, publicKey!, view.address, i, false)} onDone={onDone} />
                        </>
                      )}
                      {position && vote !== "none" && (
                        <p className="self-center text-xs text-neutral-400">You voted to {vote === "approve" ? "approve" : "reject"}.</p>
                      )}
                      {publicKey && (
                        <TxButton label="Finalize vote" variant="ghost" run={() => finalizeMilestoneTx(program, publicKey, view.address, i)} onDone={onDone} />
                      )}
                    </>
                  )}

                  {m && mKey === "approved" &&
                    (isMaker ? (
                      <TxButton label="Withdraw tranche" run={() => claimMilestoneFundsTx(program, publicKey!, refs, i)} onDone={onDone} />
                    ) : (
                      <p className="text-xs text-neutral-500">Approved. Waiting for the maker to withdraw.</p>
                    ))}

                  {m && mKey === "rejected" && (
                    <div className="w-full">
                      <Notice tone="warn">
                        Rejected. Later tranches are blocked and the remaining funds stay locked in the vault.
                      </Notice>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {status === "milestones" && c.currentMilestone === c.milestoneCount && publicKey && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="mb-3 text-xs text-neutral-500">All tranches released. Completing the campaign unlocks reward claims.</p>
          <TxButton label="Complete campaign" run={() => completeCampaignTx(program, publicKey, view.address)} onDone={onDone} />
        </div>
      )}
    </Card>
  );
}
