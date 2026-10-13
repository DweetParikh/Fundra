use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Completed @ FundraError::InvalidCampaignStatus
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
        address = campaign.reward_mint,
        seeds = [REWARD_MINT_SEED, campaign.key().as_ref()],
        bump
    )]
    pub reward_mint: Box<Account<'info, Mint>>,

    /// CHECK: PDA mint authority of the reward mint. No data.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, campaign.key().as_ref()],
        bump = campaign.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = contributor,
        associated_token::mint = reward_mint,
        associated_token::authority = contributor
    )]
    pub contributor_reward_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn claim_reward_handler(ctx: Context<ClaimReward>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let position = &mut ctx.accounts.contributor_position;

    let claimable = position
        .reward_entitlement
        .checked_sub(position.reward_claimed)
        .ok_or(FundraError::MathOverflow)?;
    require!(claimable > 0, FundraError::NothingToClaim);

    let new_minted = campaign
        .tokens_minted
        .checked_add(claimable)
        .ok_or(FundraError::MathOverflow)?;
    require!(
        new_minted <= campaign.reward_supply_cap,
        FundraError::RewardCapExceeded
    );

    // Effects before interaction: the claim is single-use because reward_claimed
    // now equals reward_entitlement.
    position.reward_claimed = position
        .reward_claimed
        .checked_add(claimable)
        .ok_or(FundraError::MathOverflow)?;
    campaign.tokens_minted = new_minted;

    let campaign_key = campaign.key();
    let bump = [campaign.vault_authority_bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, campaign_key.as_ref(), &bump]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.contributor_reward_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer_seeds,
        ),
        claimable,
    )?;
    Ok(())
}
