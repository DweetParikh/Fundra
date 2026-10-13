use anchor_lang::prelude::*;

use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum CampaignStatus {
    Draft,
    Active,
    Funded,
    Milestones,
    Completed,
    Failed,
}

/// Seeds: ["campaign", maker, campaign_id (u64 LE)]
#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub maker: Pubkey,
    pub campaign_id: u64,
    pub contribution_mint: Pubkey,
    pub decimals: u8,
    pub goal: u64,
    pub max_funding: u64,
    pub amount_raised: u64,
    pub deadline: i64,
    pub status: CampaignStatus,
    pub reward_mint: Pubkey,
    pub reward_rate_numerator: u64,
    pub reward_rate_denominator: u64,
    pub reward_supply_cap: u64,
    pub tokens_minted: u64,
    /// Index of the next tranche to release. Starts at 0 (the no-vote upfront tranche).
    pub current_milestone: u8,
    pub milestone_count: u8,
    pub milestone_percentages: [u8; MAX_MILESTONES],
    pub funds_released: u64,
    pub vault: Pubkey,
    pub core_collection: Pubkey,
    pub contributor_count: u32,
    pub bump: u8,
    pub vault_authority_bump: u8,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    #[max_len(MAX_URI_LEN)]
    pub uri: String,
}

impl Campaign {
    /// Reward in base units owed for a total contribution (floor division, u128 intermediate).
    pub fn reward_for(total_contributed: u64, numerator: u64, denominator: u64) -> Option<u64> {
        let v = (total_contributed as u128)
            .checked_mul(numerator as u128)?
            .checked_div(denominator as u128)?;
        u64::try_from(v).ok()
    }

    /// Tranche size for milestone `index`. The last tranche takes the rounding remainder
    /// so the tranches always sum to exactly `amount_raised`.
    pub fn tranche_amount(&self, index: u8) -> Option<u64> {
        if index >= self.milestone_count {
            return None;
        }
        if index + 1 == self.milestone_count {
            return self.amount_raised.checked_sub(self.funds_released);
        }
        let v = (self.amount_raised as u128)
            .checked_mul(self.milestone_percentages[index as usize] as u128)?
            .checked_div(MILESTONE_PERCENT_TOTAL as u128)?;
        u64::try_from(v).ok()
    }
}

use crate::errors::FundraError;

/// Terms that become immutable once the campaign is activated.
pub struct ValidatedTerms {
    pub milestone_percentages: [u8; MAX_MILESTONES],
    pub milestone_count: u8,
    pub reward_supply_cap: u64,
}

/// Shared validation for create_campaign and update_campaign (DRAFT only).
pub fn validate_terms(
    now: i64,
    goal: u64,
    max_funding: u64,
    deadline: i64,
    reward_rate_numerator: u64,
    reward_rate_denominator: u64,
    percentages: &[u8],
) -> Result<ValidatedTerms> {
    require!(goal > 0 && max_funding >= goal, FundraError::InvalidGoal);
    require!(reward_rate_denominator > 0, FundraError::InvalidRewardRate);

    let min_deadline = now
        .checked_add(MIN_CAMPAIGN_DURATION_SECONDS)
        .ok_or(FundraError::MathOverflow)?;
    let max_deadline = now
        .checked_add(MAX_CAMPAIGN_DURATION_SECONDS)
        .ok_or(FundraError::MathOverflow)?;
    require!(
        deadline >= min_deadline && deadline <= max_deadline,
        FundraError::InvalidDeadline
    );

    require!(
        !percentages.is_empty() && percentages.len() <= MAX_MILESTONES,
        FundraError::InvalidMilestoneCount
    );
    let mut arr = [0u8; MAX_MILESTONES];
    let mut sum: u16 = 0;
    for (i, p) in percentages.iter().enumerate() {
        require!(*p > 0, FundraError::InvalidMilestonePercentages);
        arr[i] = *p;
        sum = sum.checked_add(*p as u16).ok_or(FundraError::MathOverflow)?;
    }
    require!(
        sum == MILESTONE_PERCENT_TOTAL as u16,
        FundraError::InvalidMilestonePercentages
    );

    let reward_supply_cap =
        Campaign::reward_for(max_funding, reward_rate_numerator, reward_rate_denominator)
            .ok_or(FundraError::MathOverflow)?;

    Ok(ValidatedTerms {
        milestone_percentages: arr,
        milestone_count: percentages.len() as u8,
        reward_supply_cap,
    })
}
