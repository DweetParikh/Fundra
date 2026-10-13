use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct VoteMilestone<'info> {
    pub contributor: Signer<'info>,

    #[account(
        constraint = campaign.status == CampaignStatus::Milestones @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(
        mut,
        seeds = [CONTRIBUTOR_SEED, campaign.key().as_ref(), contributor.key().as_ref()],
        bump = contributor_position.bump,
        constraint = contributor_position.campaign == campaign.key() @ FundraError::CampaignMismatch
    )]
    pub contributor_position: Box<Account<'info, ContributorPosition>>,

    #[account(
        mut,
        seeds = [MILESTONE_SEED, campaign.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.campaign == campaign.key() @ FundraError::CampaignMismatch
    )]
    pub milestone: Box<Account<'info, Milestone>>,
}

pub fn vote_milestone_handler(
    ctx: Context<VoteMilestone>,
    milestone_index: u8,
    approve: bool,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let m = &mut ctx.accounts.milestone;
    require!(
        m.status == MilestoneStatus::UnderReview,
        FundraError::InvalidMilestoneStatus
    );
    require!(now < m.voting_deadline, FundraError::VotingClosed);

    let p = &mut ctx.accounts.contributor_position;
    let idx = milestone_index as usize;
    require!(idx < MAX_MILESTONES, FundraError::WrongMilestoneIndex);
    require!(p.votes[idx] == VoteRecord::None, FundraError::AlreadyVoted);

    // Weight is the contributor's net stake. Refunds only exist on FAILED campaigns,
    // so this equals amount_contributed while milestones are running.
    let weight = p
        .amount_contributed
        .checked_sub(p.amount_refunded)
        .ok_or(FundraError::MathOverflow)?;
    require!(weight > 0, FundraError::NoVotingWeight);

    if approve {
        m.approve_weight = m
            .approve_weight
            .checked_add(weight)
            .ok_or(FundraError::MathOverflow)?;
        p.votes[idx] = VoteRecord::Approve;
    } else {
        m.reject_weight = m
            .reject_weight
            .checked_add(weight)
            .ok_or(FundraError::MathOverflow)?;
        p.votes[idx] = VoteRecord::Reject;
    }
    Ok(())
}
