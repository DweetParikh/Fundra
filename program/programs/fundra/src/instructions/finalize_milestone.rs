use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct FinalizeMilestone<'info> {
    /// Anyone may finalize; the result is a pure function of on-chain state.
    pub caller: Signer<'info>,

    #[account(
        constraint = campaign.status == CampaignStatus::Milestones @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(
        mut,
        seeds = [MILESTONE_SEED, campaign.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.campaign == campaign.key() @ FundraError::CampaignMismatch
    )]
    pub milestone: Box<Account<'info, Milestone>>,
}

/// Outcome rules (all integer maths, u128 intermediates):
/// - Approved when quorum is met (cast >= QUORUM_BPS of amount_raised) and approve weight is
///   strictly more than APPROVAL_THRESHOLD_BPS of the weight cast.
/// - If the voting deadline passes without quorum, the milestone is rejected.
/// - Before the deadline it can be finalized early only when the result can no longer change:
///   approve weight alone exceeds half of everything raised (approved), or reject weight is at
///   least half of everything raised (rejected, approval is then arithmetically impossible).
pub fn finalize_milestone_handler(
    ctx: Context<FinalizeMilestone>,
    _milestone_index: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let raised = ctx.accounts.campaign.amount_raised as u128;
    let m = &mut ctx.accounts.milestone;
    require!(
        m.status == MilestoneStatus::UnderReview,
        FundraError::InvalidMilestoneStatus
    );

    let approve = m.approve_weight as u128;
    let reject = m.reject_weight as u128;
    let cast = approve.checked_add(reject).ok_or(FundraError::MathOverflow)?;
    let bps = BPS_DENOMINATOR as u128;

    let outcome = if now >= m.voting_deadline {
        let quorum_met = cast
            .checked_mul(bps)
            .ok_or(FundraError::MathOverflow)?
            >= raised
                .checked_mul(QUORUM_BPS as u128)
                .ok_or(FundraError::MathOverflow)?;
        let majority = approve
            .checked_mul(bps)
            .ok_or(FundraError::MathOverflow)?
            > cast
                .checked_mul(APPROVAL_THRESHOLD_BPS as u128)
                .ok_or(FundraError::MathOverflow)?;
        if quorum_met && majority {
            MilestoneStatus::Approved
        } else {
            MilestoneStatus::Rejected
        }
    } else {
        let approve_decided = approve
            .checked_mul(bps)
            .ok_or(FundraError::MathOverflow)?
            > raised
                .checked_mul(APPROVAL_THRESHOLD_BPS as u128)
                .ok_or(FundraError::MathOverflow)?;
        let reject_decided = reject
            .checked_mul(bps)
            .ok_or(FundraError::MathOverflow)?
            >= raised
                .checked_mul(APPROVAL_THRESHOLD_BPS as u128)
                .ok_or(FundraError::MathOverflow)?;
        if approve_decided {
            MilestoneStatus::Approved
        } else if reject_decided {
            MilestoneStatus::Rejected
        } else {
            return err!(FundraError::VotingStillOpen);
        }
    };

    m.status = outcome;
    Ok(())
}
