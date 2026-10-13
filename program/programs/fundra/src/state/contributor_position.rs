use anchor_lang::prelude::*;

use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum VoteRecord {
    None,
    Approve,
    Reject,
}

/// Seeds: ["contributor", campaign, contributor]
#[account]
#[derive(InitSpace)]
pub struct ContributorPosition {
    pub campaign: Pubkey,
    pub contributor: Pubkey,
    pub amount_contributed: u64,
    pub amount_refunded: u64,
    /// Pending reward in reward-mint base units. Not minted until the campaign is COMPLETED.
    pub reward_entitlement: u64,
    pub reward_claimed: u64,
    pub receipt_nft: Pubkey,
    /// One vote per contributor per milestone.
    pub votes: [VoteRecord; MAX_MILESTONES],
    pub bump: u8,
}
