import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import type { FundraProgram } from "./anchor/program";
import {
  campaignPda,
  milestonePda,
  platformConfigPda,
  positionPda,
  rewardMintPda,
  vaultAuthorityPda,
  vaultPda,
} from "./anchor/pdas";
import { MPL_CORE_PROGRAM_ID } from "./constants";

const computeBudget = (units = 400_000) => ComputeBudgetProgram.setComputeUnitLimit({ units });

/** Everything about a campaign the transaction builders need, derived from its on-chain account. */
export interface CampaignRefs {
  campaign: PublicKey;
  contributionMint: PublicKey;
  coreCollection: PublicKey;
}

const refsDerived = (r: CampaignRefs) => ({
  vault: vaultPda(r.campaign),
  vaultAuthority: vaultAuthorityPda(r.campaign),
  rewardMint: rewardMintPda(r.campaign),
});

export interface CreateParams {
  name: string;
  uri: string;
  contributionMint: PublicKey;
  goal: BN;
  maxFunding: BN;
  deadline: number;
  rateNumerator: number;
  rateDenominator: number;
  percentages: number[];
}

export async function createCampaignTx(program: FundraProgram, maker: PublicKey, p: CreateParams) {
  const idBytes = new Uint8Array(8);
  crypto.getRandomValues(idBytes);
  const campaignId = new BN(Buffer.from(idBytes));
  const campaign = campaignPda(maker, campaignId);
  const collection = Keypair.generate();
  const signature = await program.methods
    .createCampaign(
      campaignId,
      p.name,
      p.uri,
      p.goal,
      p.maxFunding,
      new BN(p.deadline),
      new BN(p.rateNumerator),
      new BN(p.rateDenominator),
      Buffer.from(p.percentages)
    )
    .accounts({
      maker,
      platformConfig: platformConfigPda(),
      campaign,
      contributionMint: p.contributionMint,
      vaultAuthority: vaultAuthorityPda(campaign),
      vault: vaultPda(campaign),
      rewardMint: rewardMintPda(campaign),
      coreCollection: collection.publicKey,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([computeBudget()])
    .signers([collection])
    .rpc();
  return { signature, campaign };
}

export const activateTx = (program: FundraProgram, maker: PublicKey, campaign: PublicKey) =>
  program.methods.activateCampaign().accounts({ maker, campaign }).rpc();

export const finalizeCampaignTx = (program: FundraProgram, caller: PublicKey, campaign: PublicKey) =>
  program.methods.finalizeCampaign().accounts({ caller, campaign }).rpc();

export const contributeTx = (program: FundraProgram, contributor: PublicKey, r: CampaignRefs, amount: BN) => {
  // A fresh keypair per call. The program only uses it on the contributor's first contribution (receipt mint).
  const receiptAsset = Keypair.generate();
  const d = refsDerived(r);
  return program.methods
    .contribute(amount)
    .accounts({
      contributor,
      campaign: r.campaign,
      contributorPosition: positionPda(r.campaign, contributor),
      contributionMint: r.contributionMint,
      contributorTokenAccount: getAssociatedTokenAddressSync(r.contributionMint, contributor),
      vault: d.vault,
      vaultAuthority: d.vaultAuthority,
      coreCollection: r.coreCollection,
      receiptAsset: receiptAsset.publicKey,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([computeBudget()])
    .signers([receiptAsset])
    .rpc();
};

export const claimRefundTx = (program: FundraProgram, contributor: PublicKey, r: CampaignRefs) => {
  const d = refsDerived(r);
  const ata = getAssociatedTokenAddressSync(r.contributionMint, contributor);
  return program.methods
    .claimRefund()
    .accounts({
      contributor,
      campaign: r.campaign,
      contributorPosition: positionPda(r.campaign, contributor),
      contributionMint: r.contributionMint,
      vault: d.vault,
      vaultAuthority: d.vaultAuthority,
      contributorTokenAccount: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([createAssociatedTokenAccountIdempotentInstruction(contributor, ata, contributor, r.contributionMint)])
    .rpc();
};

export const submitMilestoneTx = (
  program: FundraProgram,
  maker: PublicKey,
  campaign: PublicKey,
  index: number,
  proofRef: string
) =>
  program.methods
    .submitMilestone(index, proofRef)
    .accounts({ maker, campaign, milestone: milestonePda(campaign, index), systemProgram: SystemProgram.programId })
    .rpc();

export const voteTx = (
  program: FundraProgram,
  contributor: PublicKey,
  campaign: PublicKey,
  index: number,
  approve: boolean
) =>
  program.methods
    .voteMilestone(index, approve)
    .accounts({
      contributor,
      campaign,
      contributorPosition: positionPda(campaign, contributor),
      milestone: milestonePda(campaign, index),
    })
    .rpc();

export const finalizeMilestoneTx = (program: FundraProgram, caller: PublicKey, campaign: PublicKey, index: number) =>
  program.methods
    .finalizeMilestone(index)
    .accounts({ caller, campaign, milestone: milestonePda(campaign, index) })
    .rpc();

export const claimMilestoneFundsTx = (program: FundraProgram, maker: PublicKey, r: CampaignRefs, index: number) => {
  const d = refsDerived(r);
  const ata = getAssociatedTokenAddressSync(r.contributionMint, maker);
  return program.methods
    .claimMilestoneFunds(index)
    .accounts({
      maker,
      campaign: r.campaign,
      milestone: index > 0 ? milestonePda(r.campaign, index) : null,
      contributionMint: r.contributionMint,
      vault: d.vault,
      vaultAuthority: d.vaultAuthority,
      makerTokenAccount: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([createAssociatedTokenAccountIdempotentInstruction(maker, ata, maker, r.contributionMint)])
    .rpc();
};

export const completeCampaignTx = (program: FundraProgram, caller: PublicKey, campaign: PublicKey) =>
  program.methods.completeCampaign().accounts({ caller, campaign }).rpc();

export const claimRewardTx = (program: FundraProgram, contributor: PublicKey, r: CampaignRefs) => {
  const d = refsDerived(r);
  return program.methods
    .claimReward()
    .accounts({
      contributor,
      campaign: r.campaign,
      contributorPosition: positionPda(r.campaign, contributor),
      rewardMint: d.rewardMint,
      vaultAuthority: d.vaultAuthority,
      contributorRewardAccount: getAssociatedTokenAddressSync(d.rewardMint, contributor),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
