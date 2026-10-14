"use client";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { positionPda } from "@/lib/anchor/pdas";
import { useFundraProgram } from "./useFundraProgram";
import { usePolling } from "./usePolling";
import type { PositionAccount } from "./useCampaign";

export interface PositionView {
  address: PublicKey;
  position: PositionAccount | null;
  /** Wallet balance of the campaign's contribution token, in base units. */
  tokenBalance: bigint;
  tokenAccount: PublicKey;
}

export function usePosition(campaign: PublicKey | undefined, contributionMint: PublicKey | undefined) {
  const { program, connection, publicKey } = useFundraProgram();
  return usePolling<PositionView | null>(
    async () => {
      if (!campaign || !publicKey || !contributionMint) return null;
      const address = positionPda(campaign, publicKey);
      const tokenAccount = getAssociatedTokenAddressSync(contributionMint, publicKey);
      const [position, bal] = await Promise.all([
        program.account.contributorPosition.fetchNullable(address),
        getAccount(connection, tokenAccount).then((a) => a.amount).catch(() => 0n),
      ]);
      return { address, position, tokenBalance: bal, tokenAccount };
    },
    [campaign?.toBase58(), publicKey?.toBase58(), contributionMint?.toBase58(), program],
    12000,
    !!campaign && !!publicKey && !!contributionMint
  );
}
