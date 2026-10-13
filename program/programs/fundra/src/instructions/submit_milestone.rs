use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct SubmitMilestone<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        has_one = maker @ FundraError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Milestones @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    /// One account per milestone index; `init` makes a second submission for the same
    /// index impossible, so a rejected milestone cannot be silently retried.
    #[account(
        init,
        payer = maker,
        space = 8 + Milestone::INIT_SPACE,
        seeds = [MILESTONE_SEED, campaign.key().as_ref(), &[milestone_index]],
        bump
    )]
    pub milestone: Box<Account<'info, Milestone>>,

    pub system_program: Program<'info, System>,
}

pub fn submit_milestone_handler(
    ctx: Context<SubmitMilestone>,
    milestone_index: u8,
    proof_ref: String,
) -> Result<()> {
    let c = &ctx.accounts.campaign;
    require!(
        milestone_index == c.current_milestone && milestone_index > UPFRONT_MILESTONE_INDEX,
        FundraError::WrongMilestoneIndex
    );
    require!(milestone_index < c.milestone_count, FundraError::WrongMilestoneIndex);
    require!(
        !proof_ref.is_empty() && proof_ref.len() <= MAX_PROOF_REF_LEN,
        FundraError::InvalidProofRef
    );

    let now = Clock::get()?.unix_timestamp;
    let m = &mut ctx.accounts.milestone;
    m.campaign = ctx.accounts.campaign.key();
    m.index = milestone_index;
    m.status = MilestoneStatus::UnderReview;
    m.proof_ref = proof_ref;
    m.submitted_at = now;
    m.voting_deadline = now
        .checked_add(VOTING_PERIOD_SECONDS)
        .ok_or(FundraError::MathOverflow)?;
    m.approve_weight = 0;
    m.reject_weight = 0;
    m.funds_claimed = false;
    m.bump = ctx.bumps.milestone;
    Ok(())
}
