import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import idl from "./idl/fundra.json";
import { PROGRAM_ID } from "./program";

/**
 * Seeds are read from the `constants` section of the generated IDL, which Anchor builds from
 * program/programs/fundra/src/constants.rs. They therefore cannot drift from the program.
 * `npm run check:seeds` additionally compares the IDL against constants.rs and the literal
 * seed list in scripts/check-seeds.mjs.
 */
function seed(name: string): Buffer {
  const c = (idl as { constants: { name: string; value: string }[] }).constants.find((x) => x.name === name);
  if (!c) throw new Error(`IDL is missing constant ${name}`);
  return Buffer.from(JSON.parse(c.value) as number[]);
}

export const SEEDS = {
  PLATFORM_CONFIG: seed("PLATFORM_CONFIG_SEED"),
  CAMPAIGN: seed("CAMPAIGN_SEED"),
  VAULT_AUTHORITY: seed("VAULT_AUTHORITY_SEED"),
  VAULT: seed("VAULT_SEED"),
  REWARD_MINT: seed("REWARD_MINT_SEED"),
  CONTRIBUTOR: seed("CONTRIBUTOR_SEED"),
  MILESTONE: seed("MILESTONE_SEED"),
} as const;

const find = (seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];

export const platformConfigPda = () => find([SEEDS.PLATFORM_CONFIG]);

export const campaignPda = (maker: PublicKey, campaignId: BN) =>
  find([SEEDS.CAMPAIGN, maker.toBuffer(), campaignId.toArrayLike(Buffer, "le", 8)]);

export const vaultAuthorityPda = (campaign: PublicKey) => find([SEEDS.VAULT_AUTHORITY, campaign.toBuffer()]);
export const vaultPda = (campaign: PublicKey) => find([SEEDS.VAULT, campaign.toBuffer()]);
export const rewardMintPda = (campaign: PublicKey) => find([SEEDS.REWARD_MINT, campaign.toBuffer()]);

export const positionPda = (campaign: PublicKey, contributor: PublicKey) =>
  find([SEEDS.CONTRIBUTOR, campaign.toBuffer(), contributor.toBuffer()]);

export const milestonePda = (campaign: PublicKey, index: number) =>
  find([SEEDS.MILESTONE, campaign.toBuffer(), Buffer.from([index])]);
