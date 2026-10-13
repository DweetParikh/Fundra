use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct ClaimMilestoneFunds<'info> {
    pub maker: Signer<'info>,

    #[account(mut, has_one = maker @ FundraError::Unauthorized)]
    pub campaign: Box<Account<'info, Campaign>>,

    /// Required for milestones 1 and up. Omitted (program id placeholder) for milestone 0,
    /// which needs no vote.
    #[account(
        mut,
        seeds = [MILESTONE_SEED, campaign.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.campaign == campaign.key() @ FundraError::CampaignMismatch
    )]
    pub milestone: Option<Box<Account<'info, Milestone>>>,

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
        constraint = maker_token_account.mint == campaign.contribution_mint @ FundraError::WrongMint,
        constraint = maker_token_account.owner == maker.key() @ FundraError::WrongTokenOwner
    )]
    pub maker_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

/// Releases exactly one tranche (a percentage of amount_raised). Everything else stays in
/// the vault. The transfer is signed by the vault authority PDA; the maker only chooses
/// where their own tranche lands.
pub fn claim_milestone_funds_handler(
    ctx: Context<ClaimMilestoneFunds>,
    milestone_index: u8,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        milestone_index == campaign.current_milestone,
        FundraError::WrongMilestoneIndex
    );

    if milestone_index == UPFRONT_MILESTONE_INDEX {
        require!(
            campaign.status == CampaignStatus::Funded,
            FundraError::InvalidCampaignStatus
        );
    } else {
        // A rejected milestone never reaches Approved, so every later tranche stays blocked.
        require!(
            campaign.status == CampaignStatus::Milestones,
            FundraError::InvalidCampaignStatus
        );
        let m = ctx
            .accounts
            .milestone
            .as_ref()
            .ok_or(FundraError::MilestoneAccountRequired)?;
        require!(
            m.status == MilestoneStatus::Approved,
            FundraError::InvalidMilestoneStatus
        );
        require!(!m.funds_claimed, FundraError::AlreadyClaimed);
    }

    let amount = campaign
        .tranche_amount(milestone_index)
        .ok_or(FundraError::MathOverflow)?;
    require!(amount > 0, FundraError::ZeroAmount);

    // Effects before interaction.
    campaign.funds_released = campaign
        .funds_released
        .checked_add(amount)
        .ok_or(FundraError::MathOverflow)?;
    require!(
        campaign.funds_released <= campaign.amount_raised,
        FundraError::MathOverflow
    );
    campaign.current_milestone = campaign
        .current_milestone
        .checked_add(1)
        .ok_or(FundraError::MathOverflow)?;
    if milestone_index == UPFRONT_MILESTONE_INDEX {
        campaign.status = CampaignStatus::Milestones;
    } else if let Some(m) = ctx.accounts.milestone.as_mut() {
        m.funds_claimed = true;
    }

    let campaign_key = campaign.key();
    let bump = [campaign.vault_authority_bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, campaign_key.as_ref(), &bump]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.contribution_mint.to_account_info(),
                to: ctx.accounts.maker_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.contribution_mint.decimals,
    )?;
    Ok(())
}
