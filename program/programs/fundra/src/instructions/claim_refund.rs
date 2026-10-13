use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        constraint = campaign.status == CampaignStatus::Failed @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(
        mut,
        seeds = [CONTRIBUTOR_SEED, campaign.key().as_ref(), contributor.key().as_ref()],
        bump = contributor_position.bump,
        constraint = contributor_position.campaign == campaign.key() @ FundraError::CampaignMismatch
    )]
    pub contributor_position: Box<Account<'info, ContributorPosition>>,

    #[account(address = campaign.contribution_mint @ FundraError::WrongMint)]
    pub contribution_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        address = campaign.vault,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: PDA signer for the vault. No data.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, campaign.key().as_ref()],
        bump = campaign.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = contributor_token_account.mint == campaign.contribution_mint @ FundraError::WrongMint,
        constraint = contributor_token_account.owner == contributor.key() @ FundraError::WrongTokenOwner
    )]
    pub contributor_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

/// No admin or maker approval. Single-use: `amount_refunded` is set before the transfer
/// returns, so a second call computes a zero refund and fails.
pub fn claim_refund_handler(ctx: Context<ClaimRefund>) -> Result<()> {
    require!(
        ctx.accounts.campaign.funds_released == 0,
        FundraError::FundsAlreadyReleased
    );

    let position = &mut ctx.accounts.contributor_position;
    let refund = position
        .amount_contributed
        .checked_sub(position.amount_refunded)
        .ok_or(FundraError::MathOverflow)?;
    require!(refund > 0, FundraError::NothingToRefund);

    // Effects before interaction.
    position.amount_refunded = position
        .amount_refunded
        .checked_add(refund)
        .ok_or(FundraError::MathOverflow)?;
    // Cancel the pending reward: a failed campaign pays no rewards.
    position.reward_entitlement = 0;

    let campaign_key = ctx.accounts.campaign.key();
    let bump = [ctx.accounts.campaign.vault_authority_bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, campaign_key.as_ref(), &bump]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.contribution_mint.to_account_info(),
                to: ctx.accounts.contributor_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer_seeds,
        ),
        refund,
        ctx.accounts.contribution_mint.decimals,
    )?;
    Ok(())
}
