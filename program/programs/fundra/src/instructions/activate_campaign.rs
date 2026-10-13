use anchor_lang::prelude::*;

use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct ActivateCampaign<'info> {
    pub maker: Signer<'info>,

    #[account(
        mut,
        has_one = maker @ FundraError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Draft @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,
}

/// Locks the terms. From here on there is no instruction that edits goal, deadline,
/// mint, reward rate, cap, milestone split or maker.
pub fn activate_campaign_handler(ctx: Context<ActivateCampaign>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let c = &mut ctx.accounts.campaign;
    require!(c.deadline > now, FundraError::DeadlinePassed);
    c.status = CampaignStatus::Active;
    Ok(())
}
