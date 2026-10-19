"use client";
import { useState } from "react";
import { useFundraProgram } from "@/hooks/useFundraProgram";
import type { CampaignRow } from "@/hooks/useCampaigns";
import { formatAmount, trancheAmounts } from "@/lib/format";
import { enumKey } from "@/lib/status";
import { submitMilestoneTx } from "@/lib/tx";
import { Card, Notice, SectionTitle, TxButton } from "./ui";

/**
 * Maker-side release request. Submitting proof for the current milestone is what starts the
 * contributor vote. Milestone 0 needs no proof; it is claimed directly once the campaign is funded.
 */
export default function MakerRequestRelease({ row, onDone }: { row: CampaignRow; onDone: () => void }) {
  const { program } = useFundraProgram();
  const [proof, setProof] = useState("");
  const c = row.account;
  const status = enumKey(c.status);
  const idx = c.currentMilestone;
  const tranche = trancheAmounts(c.amountRaised, Array.from(c.milestonePercentages), c.milestoneCount)[idx];
  const canSubmit = status === "milestones" && idx > 0 && idx < c.milestoneCount;

  return (
    <Card>
      <SectionTitle>Request release</SectionTitle>
      <div className="space-y-4">
        <div className="panel-sm p-4">
          <div className="text-xs text-neutral-500">Next available tranche</div>
          <div className="mt-1 text-xl font-semibold text-white">{formatAmount(tranche, c.decimals)}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {status === "funded"
              ? "Milestone 0 is available now, with no vote."
              : canSubmit
              ? `Milestone ${idx}. Submit proof to start the contributor vote.`
              : "Nothing is pending for this campaign."}
          </div>
        </div>

        {canSubmit && (
          <>
            <input
              className="input font-mono text-xs"
              maxLength={128}
              placeholder="Proof reference (URL, IPFS or GitHub)"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
            <TxButton
              label="Request release"
              className="w-full"
              disabled={!proof.trim()}
              run={() => submitMilestoneTx(program, c.maker, row.address, idx, proof.trim())}
              onDone={() => {
                setProof("");
                onDone();
              }}
            />
            <Notice>Contributors review the proof and vote. Approval needs more than 50% of the weight cast, with 20% quorum.</Notice>
          </>
        )}
      </div>
    </Card>
  );
}
