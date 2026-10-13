use anchor_lang::prelude::*;

use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct CompleteCampaign<'info> {
    /// Permissionless on purpose: completion is a pure function of on-chain state, and
    /// contributors' rewards must not depend on the maker remembering to call it.
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Milestones @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,
}

pub fn complete_campaign_handler(ctx: Context<CompleteCampaign>) -> Result<()> {
    let c = &mut ctx.accounts.campaign;
    require!(
        c.current_milestone == c.milestone_count && c.funds_released == c.amount_raised,
        FundraError::MilestonesIncomplete
    );
    c.status = CampaignStatus::Completed;
    Ok(())
}
