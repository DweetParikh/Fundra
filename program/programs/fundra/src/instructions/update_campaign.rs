use anchor_lang::prelude::*;

use crate::errors::FundraError;
use crate::state::*;

/// DRAFT-only edit of the economic terms. After `activate_campaign` this instruction
/// always fails, which is what makes the terms immutable. The maker address, the
/// contribution mint and all PDA addresses can never be changed, even in DRAFT.
#[derive(Accounts)]
pub struct UpdateCampaign<'info> {
    pub maker: Signer<'info>,

    #[account(
        mut,
        has_one = maker @ FundraError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Draft @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,
}

pub fn update_campaign_handler(
    ctx: Context<UpdateCampaign>,
    goal: u64,
    max_funding: u64,
    deadline: i64,
    reward_rate_numerator: u64,
    reward_rate_denominator: u64,
    milestone_percentages: Vec<u8>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let terms = validate_terms(
        now,
        goal,
        max_funding,
        deadline,
        reward_rate_numerator,
        reward_rate_denominator,
        &milestone_percentages,
    )?;
    let c = &mut ctx.accounts.campaign;
    c.goal = goal;
    c.max_funding = max_funding;
    c.deadline = deadline;
    c.reward_rate_numerator = reward_rate_numerator;
    c.reward_rate_denominator = reward_rate_denominator;
    c.reward_supply_cap = terms.reward_supply_cap;
    c.milestone_count = terms.milestone_count;
    c.milestone_percentages = terms.milestone_percentages;
    Ok(())
}
