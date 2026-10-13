use anchor_lang::prelude::*;

// ---------------------------------------------------------------------------
// PDA seeds. The frontend (lib/anchor/pdas.ts) mirrors these byte-for-byte.
// ---------------------------------------------------------------------------
#[constant]
pub const PLATFORM_CONFIG_SEED: &[u8] = b"platform_config";
#[constant]
pub const CAMPAIGN_SEED: &[u8] = b"campaign";
#[constant]
pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const REWARD_MINT_SEED: &[u8] = b"reward_mint";
#[constant]
pub const CONTRIBUTOR_SEED: &[u8] = b"contributor";
#[constant]
pub const MILESTONE_SEED: &[u8] = b"milestone";

// ---------------------------------------------------------------------------
// Policy defaults (decisions the spec left open). Each one is a named constant.
// ---------------------------------------------------------------------------

/// Basis-point denominator used for threshold maths.
#[constant]
pub const BPS_DENOMINATOR: u64 = 10_000;

/// A milestone is approved only if approve weight is STRICTLY MORE than this share
/// of the weight cast (5_000 bps = more than 50%).
#[constant]
pub const APPROVAL_THRESHOLD_BPS: u64 = 5_000;

/// Quorum: total weight cast must be at least this share of `amount_raised`
/// (2_000 bps = 20%). If quorum is not reached by the voting deadline the
/// milestone is rejected.
#[constant]
pub const QUORUM_BPS: u64 = 2_000;

/// How long contributors can vote after a milestone is submitted (7 days).
#[constant]
pub const VOTING_PERIOD_SECONDS: i64 = 7 * 24 * 60 * 60;

/// Index of the first milestone. It releases without a vote once the campaign is FUNDED.
#[constant]
pub const UPFRONT_MILESTONE_INDEX: u8 = 0;

/// Maximum number of milestones a campaign may define.
pub const MAX_MILESTONES: usize = 8;

/// Milestone percentages must sum to exactly this value.
#[constant]
pub const MILESTONE_PERCENT_TOTAL: u8 = 100;

/// Shortest allowed campaign length. Kept tiny so Devnet tests can run quickly;
/// raise it (for example to one day) before any production use.
#[constant]
pub const MIN_CAMPAIGN_DURATION_SECONDS: i64 = 5;

/// Longest allowed campaign length (365 days).
#[constant]
pub const MAX_CAMPAIGN_DURATION_SECONDS: i64 = 365 * 24 * 60 * 60;

/// Maximum byte lengths for stored strings.
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_URI_LEN: usize = 128;
/// Off-chain identifier only (for example an IPFS CID or Arweave tx id). No funds or authority attach to it.
pub const MAX_PROOF_REF_LEN: usize = 128;
