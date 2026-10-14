"use client";
import { PublicKey } from "@solana/web3.js";
import { useFundraProgram } from "./useFundraProgram";
import { usePolling } from "./usePolling";
import type { CampaignAccount, PositionAccount } from "./useCampaign";

export interface CampaignRow {
  address: PublicKey;
  account: CampaignAccount;
}

/** All campaigns, newest deadline first. Optionally filtered to one maker (memcmp after the 8-byte discriminator). */
export function useCampaigns(maker?: PublicKey | null, enabled = true) {
  const { program } = useFundraProgram();
  return usePolling<CampaignRow[]>(
    async () => {
      const filters = maker ? [{ memcmp: { offset: 8, bytes: maker.toBase58() } }] : [];
      const rows = await program.account.campaign.all(filters);
      return rows
        .map((r) => ({ address: r.publicKey, account: r.account }))
        .sort((a, b) => b.account.deadline.toNumber() - a.account.deadline.toNumber());
    },
    [maker?.toBase58() ?? "all", program],
    20000,
    enabled
  );
}

export interface PositionRow {
  address: PublicKey;
  account: PositionAccount;
  campaign: CampaignAccount | null;
}

/** Positions of one contributor (memcmp: 8 discriminator + 32 campaign bytes), joined with their campaigns. */
export function useContributorPositions(contributor: PublicKey | null) {
  const { program } = useFundraProgram();
  return usePolling<PositionRow[]>(
    async () => {
      if (!contributor) return [];
      const rows = await program.account.contributorPosition.all([
        { memcmp: { offset: 8 + 32, bytes: contributor.toBase58() } },
      ]);
      const campaigns = await program.account.campaign.fetchMultiple(rows.map((r) => r.account.campaign));
      return rows.map((r, i) => ({ address: r.publicKey, account: r.account, campaign: campaigns[i] }));
    },
    [contributor?.toBase58() ?? "none", program],
    20000,
    !!contributor
  );
}
