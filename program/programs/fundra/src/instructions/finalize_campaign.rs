use anchor_lang::prelude::*;

use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct FinalizeCampaign<'info> {
    /// Anyone may finalize once the deadline has passed; the outcome is fully determined on-chain.
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Active @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,
}

pub fn finalize_campaign_handler(ctx: Context<FinalizeCampaign>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let c = &mut ctx.accounts.campaign;
    require!(now >= c.deadline, FundraError::DeadlineNotReached);
    c.status = if c.amount_raised >= c.goal {
        CampaignStatus::Funded
    } else {
        CampaignStatus::Failed
    };
    Ok(())
}
