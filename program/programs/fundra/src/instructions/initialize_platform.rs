use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [PLATFORM_CONFIG_SEED],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform_handler(ctx: Context<InitializePlatform>) -> Result<()> {
    let cfg = &mut ctx.accounts.platform_config;
    cfg.admin = ctx.accounts.admin.key();
    cfg.bump = ctx.bumps.platform_config;
    Ok(())
}
