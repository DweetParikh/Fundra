"use client";
import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { Fundra } from "@/lib/anchor/idl/fundra";
import { milestonePda, rewardMintPda, vaultAuthorityPda, vaultPda } from "@/lib/anchor/pdas";
import { MPL_CORE_PROGRAM_ID } from "@/lib/constants";
import { useFundraProgram } from "./useFundraProgram";
import { usePolling } from "./usePolling";

export type CampaignAccount = IdlAccounts<Fundra>["campaign"];
export type MilestoneAccount = IdlAccounts<Fundra>["milestone"];
export type PositionAccount = IdlAccounts<Fundra>["contributorPosition"];

export interface MintInfo {
  address: PublicKey;
  programOwner: PublicKey;
  decimals: number;
  supply: bigint;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

export interface CampaignView {
  address: PublicKey;
  campaign: CampaignAccount;
  /** Index 0 is the upfront tranche and never has an account. Missing account = still PENDING. */
  milestones: (MilestoneAccount | null)[];
  vault: PublicKey;
  vaultAuthority: PublicKey;
  vaultBalance: bigint;
  vaultOwner: PublicKey | null;
  contributionMint: MintInfo | null;
  rewardMint: MintInfo | null;
  rewardMintPda: PublicKey;
  collectionUpdateAuthority: PublicKey | null;
}

export function parseMint(address: PublicKey, info: { owner: PublicKey; data: Buffer } | null): MintInfo | null {
  if (!info || info.data.length < MintLayout.span) return null;
  const m = MintLayout.decode(info.data.subarray(0, MintLayout.span));
  return {
    address,
    programOwner: info.owner,
    decimals: m.decimals,
    supply: m.supply,
    mintAuthority: m.mintAuthorityOption ? m.mintAuthority : null,
    freezeAuthority: m.freezeAuthorityOption ? m.freezeAuthority : null,
  };
}

export function useCampaign(address: string | undefined) {
  const { program, connection } = useFundraProgram();
  const key = useMemo(() => {
    try {
      return address ? new PublicKey(address) : null;
    } catch {
      return null;
    }
  }, [address]);

  const poll = usePolling<CampaignView | null>(
    async () => {
      if (!key) return null;
      const campaign = await program.account.campaign.fetch(key);
      const vault = vaultPda(key);
      const vaultAuthority = vaultAuthorityPda(key);
      const rewardMint = rewardMintPda(key);

      const [infos, milestoneAccounts] = await Promise.all([
        connection.getMultipleAccountsInfo([vault, campaign.contributionMint, rewardMint, campaign.coreCollection]),
        campaign.milestoneCount > 1
          ? program.account.milestone.fetchMultiple(
              Array.from({ length: campaign.milestoneCount - 1 }, (_, i) => milestonePda(key, i + 1))
            )
          : Promise.resolve([]),
      ]);

      const [vaultInfo, mintInfo, rewardInfo, collectionInfo] = infos;
      let vaultBalance = 0n;
      let vaultOwner: PublicKey | null = null;
      if (vaultInfo && vaultInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        const t = AccountLayout.decode(vaultInfo.data.subarray(0, AccountLayout.span));
        vaultBalance = t.amount;
        vaultOwner = t.owner;
      }
      // Core CollectionV1 layout: [key = 5][update_authority: 32 bytes]...
      let collectionUpdateAuthority: PublicKey | null = null;
      if (collectionInfo && collectionInfo.owner.equals(MPL_CORE_PROGRAM_ID) && collectionInfo.data[0] === 5) {
        collectionUpdateAuthority = new PublicKey(collectionInfo.data.subarray(1, 33));
      }

      return {
        address: key,
        campaign,
        milestones: [null, ...milestoneAccounts],
        vault,
        vaultAuthority,
        vaultBalance,
        vaultOwner,
        contributionMint: parseMint(campaign.contributionMint, mintInfo),
        rewardMint: parseMint(rewardMint, rewardInfo),
        rewardMintPda: rewardMint,
        collectionUpdateAuthority,
      };
    },
    [key?.toBase58(), program],
    12000,
    !!key
  );

  return { ...poll, valid: !!address && !!key };
}
