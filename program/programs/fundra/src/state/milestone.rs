use anchor_lang::prelude::*;

use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MilestoneStatus {
    Pending,
    UnderReview,
    Approved,
    Rejected,
}

/// Seeds: ["milestone", campaign, index (u8)]
/// Created when the maker submits proof. Before that the milestone is implicitly PENDING.
#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub campaign: Pubkey,
    pub index: u8,
    pub status: MilestoneStatus,
    /// Off-chain identifier only (for example an IPFS CID). Nothing on-chain trusts its content.
    #[max_len(MAX_PROOF_REF_LEN)]
    pub proof_ref: String,
    pub submitted_at: i64,
    pub voting_deadline: i64,
    pub approve_weight: u64,
    pub reject_weight: u64,
    pub funds_claimed: bool,
    pub bump: u8,
}
