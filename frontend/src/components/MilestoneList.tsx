"use client";
import { useState } from "react";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import { useNow } from "@/hooks/useNow";
import type { CampaignView } from "@/hooks/useCampaign";
import type { PositionView } from "@/hooks/usePosition";
import { formatAmount, formatCountdown, trancheAmounts } from "@/lib/format";
import { MILESTONE_STATUS_LABEL, enumKey } from "@/lib/status";
import {
  claimMilestoneFundsTx,
  completeCampaignTx,
  finalizeMilestoneTx,
  submitMilestoneTx,
  voteTx,
} from "@/lib/tx";
import { Badge, Card, Notice, SectionTitle, TxButton } from "./ui";

// Mirrors QUORUM_BPS / APPROVAL_THRESHOLD_BPS in constants.rs (also present in the IDL constants).
const QUORUM_PCT = 20;

export default function MilestoneList({
  view,
  pos,
  onDone,
}: {
  view: CampaignView;
  pos: PositionView | null;
  onDone: () => void;
}) {
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
      {!live && (
        <p className="mb-4 text-xs text-neutral-500">
          Planned release schedule. Nothing is released until the campaign is funded.
        </p>
      )}
      <ol className="space-y-3">
        {Array.from({ length: c.milestoneCount }, (_, i) => {
          const m = view.milestones[i] ?? null;
          const released = i < c.currentMilestone;
          const isCurrent = live && i === c.currentMilestone && status !== "completed";
          const mKey = m ? enumKey(m.status) : "pending";
          const badge = released ? "released" : i === 0 && status === "funded" ? "approved" : mKey;
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
            <li key={i} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-white">
                    Milestone {i + 1}
                    {i === 0 && <span className="ml-2 text-xs font-normal text-neutral-500">upfront, no vote</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {c.milestonePercentages[i]}% of raised, {formatAmount(tranches[i], d)} tokens
                  </div>
                </div>
                <Badge kind={badge}>{label}</Badge>
              </div>

              {m && m.proofRef && (
                <p className="mt-3 break-all font-mono text-xs text-neutral-400">Proof reference: {m.proofRef}</p>
              )}

              {m && mKey === "underReview" && (
                <div className="mt-3 space-y-1 text-xs text-neutral-500">
                  <p>
                    Approve {formatAmount(m.approveWeight, d)} / Reject {formatAmount(m.rejectWeight, d)}. Weight cast:{" "}
                    {raised ? ((cast / raised) * 100).toFixed(1) : "0"}% of raised (quorum {QUORUM_PCT}%).
                  </p>
                  <p>Voting {formatCountdown(m.votingDeadline.toNumber(), now)}. More than 50% of the weight cast must approve.</p>
                </div>
              )}

              {isCurrent && (
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  {i === 0 && status === "funded" && (
                    isMaker ? (
                      <TxButton label="Claim upfront tranche" run={() => claimMilestoneFundsTx(program, publicKey!, refs, 0)} onDone={onDone} />
                    ) : (
                      <p className="text-xs text-neutral-500">Waiting for the maker to claim the upfront tranche.</p>
                    )
                  )}

                  {i > 0 && status === "milestones" && !m && (
                    isMaker ? (
                      <div className="w-full space-y-2">
                        <input
                          className="input font-mono"
                          maxLength={128}
                          placeholder="Proof identifier (for example an IPFS CID)"
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
                        <p className="text-xs text-neutral-500">Only an off-chain identifier is stored. Contributors review the work and vote.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">Waiting for the maker to submit proof.</p>
                    )
                  )}

                  {m && mKey === "underReview" && (
                    <>
                      {position && vote === "none" && position.amountContributed.gt(position.amountRefunded) && now / 1000 < m.votingDeadline.toNumber() && (
                        <>
                          <TxButton label="Approve" run={() => voteTx(program, publicKey!, view.address, i, true)} onDone={onDone} />
                          <TxButton label="Reject" variant="ghost" run={() => voteTx(program, publicKey!, view.address, i, false)} onDone={onDone} />
                        </>
                      )}
                      {position && vote !== "none" && <p className="text-xs text-neutral-400">You voted to {vote === "approve" ? "approve" : "reject"}.</p>}
                      {publicKey && (
                        <TxButton
                          label="Finalize vote"
                          variant="ghost"
                          run={() => finalizeMilestoneTx(program, publicKey, view.address, i)}
                          onDone={onDone}
                        />
                      )}
                    </>
                  )}

                  {m && mKey === "approved" && (
                    isMaker ? (
                      <TxButton label="Claim tranche" run={() => claimMilestoneFundsTx(program, publicKey!, refs, i)} onDone={onDone} />
                    ) : (
                      <p className="text-xs text-neutral-500">Approved. Waiting for the maker to claim this tranche.</p>
                    )
                  )}

                  {m && mKey === "rejected" && (
                    <div className="w-full">
                      <Notice tone="warn">
                        This milestone was rejected. Later tranches are blocked and the remaining funds stay locked in the vault.
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
        <div className="mt-5">
          <p className="mb-2 text-xs text-neutral-500">All tranches have been released. Completing the campaign unlocks reward claims.</p>
          <TxButton label="Complete campaign" run={() => completeCampaignTx(program, publicKey, view.address)} onDone={onDone} />
        </div>
      )}
    </Card>
  );
}
