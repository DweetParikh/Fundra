use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use mpl_core::{
    instructions::CreateV2CpiBuilder,
    types::{Plugin, PluginAuthorityPair, PermanentFreezeDelegate},
};

use crate::constants::*;
use crate::errors::FundraError;
use crate::state::*;

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Active @ FundraError::InvalidCampaignStatus
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + ContributorPosition::INIT_SPACE,
        seeds = [CONTRIBUTOR_SEED, campaign.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contributor_position: Box<Account<'info, ContributorPosition>>,

    #[account(address = campaign.contribution_mint @ FundraError::WrongMint)]
    pub contribution_mint: Box<Account<'info, Mint>>,

    /// Source must hold the campaign's contribution mint and be owned (and signed for)
    /// by the contributor.
    #[account(
        mut,
        constraint = contributor_token_account.mint == campaign.contribution_mint @ FundraError::WrongMint,
        constraint = contributor_token_account.owner == contributor.key() @ FundraError::WrongTokenOwner
    )]
    pub contributor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        address = campaign.vault,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: PDA signer for the Core collection update authority. No data.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, campaign.key().as_ref()],
        bump = campaign.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: address-constrained to the campaign's Core collection; validated by Core on CPI.
    #[account(mut, address = campaign.core_collection)]
    pub core_collection: UncheckedAccount<'info>,

    /// Fresh keypair from the client. Only used on a contributor's first contribution
    /// (when the receipt is minted); for later contributions pass any unused keypair.
    #[account(mut)]
    pub receipt_asset: Signer<'info>,

    /// CHECK: address-constrained to the Metaplex Core program.
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn contribute_handler(ctx: Context<Contribute>, amount: u64) -> Result<()> {
    require!(amount > 0, FundraError::ZeroAmount);

    let now = Clock::get()?.unix_timestamp;
    let campaign_key = ctx.accounts.campaign.key();

    // State checks first.
    require!(
        now < ctx.accounts.campaign.deadline,
        FundraError::DeadlinePassed
    );
    let new_raised = ctx
        .accounts
        .campaign
        .amount_raised
        .checked_add(amount)
        .ok_or(FundraError::MathOverflow)?;
    require!(
        new_raised <= ctx.accounts.campaign.max_funding,
        FundraError::MaxFundingExceeded
    );

    // Move tokens: contributor -> vault. The contributor signs; the vault is PDA-controlled.
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.contributor_token_account.to_account_info(),
                mint: ctx.accounts.contribution_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.contributor.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.contribution_mint.decimals,
    )?;

    // Position bookkeeping.
    let is_new = ctx.accounts.contributor_position.campaign == Pubkey::default();
    let position = &mut ctx.accounts.contributor_position;
    if is_new {
        position.campaign = campaign_key;
        position.contributor = ctx.accounts.contributor.key();
        position.amount_contributed = 0;
        position.amount_refunded = 0;
        position.reward_entitlement = 0;
        position.reward_claimed = 0;
        position.receipt_nft = Pubkey::default();
        position.votes = [VoteRecord::None; MAX_MILESTONES];
        position.bump = ctx.bumps.contributor_position;
    }
    position.amount_contributed = position
        .amount_contributed
        .checked_add(amount)
        .ok_or(FundraError::MathOverflow)?;

    // Pending reward only. Nothing is minted until the campaign is COMPLETED.
    // Computed from the running total so per-contribution rounding never accumulates.
    let c = &ctx.accounts.campaign;
    position.reward_entitlement = Campaign::reward_for(
        position.amount_contributed,
        c.reward_rate_numerator,
        c.reward_rate_denominator,
    )
    .ok_or(FundraError::MathOverflow)?;

    // Frozen receipt NFT on the first contribution only.
    if is_new {
        let core_program = ctx.accounts.mpl_core_program.to_account_info();
        let asset = ctx.accounts.receipt_asset.to_account_info();
        let collection = ctx.accounts.core_collection.to_account_info();
        let authority = ctx.accounts.vault_authority.to_account_info();
        let payer = ctx.accounts.contributor.to_account_info();
        let owner = ctx.accounts.contributor.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();
        let receipt_name = format!("{} Receipt", c.name);
        let bump = [c.vault_authority_bump];
        let signer_seeds: &[&[&[u8]]] =
            &[&[VAULT_AUTHORITY_SEED, campaign_key.as_ref(), &bump]];

        // PermanentFreezeDelegate (frozen = true) is authority-managed by the collection's
        // update authority, which is the vault authority PDA. The owner cannot thaw, transfer
        // or burn the receipt, and the program never exposes a thaw path.
        CreateV2CpiBuilder::new(&core_program)
            .asset(&asset)
            .collection(Some(&collection))
            .authority(Some(&authority))
            .payer(&payer)
            .owner(Some(&owner))
            .system_program(&system_program)
            .name(receipt_name)
            .uri(c.uri.clone())
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
                authority: None,
            }])
            .invoke_signed(signer_seeds)?;

        ctx.accounts.contributor_position.receipt_nft = ctx.accounts.receipt_asset.key();
    }

    let campaign = &mut ctx.accounts.campaign;
    campaign.amount_raised = new_raised;
    if is_new {
        campaign.contributor_count = campaign
            .contributor_count
            .checked_add(1)
            .ok_or(FundraError::MathOverflow)?;
    }
    Ok(())
}
