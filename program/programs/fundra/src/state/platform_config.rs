use anchor_lang::prelude::*;

/// Platform-wide admin settings. The admin never custodies funds: no vault, mint
/// or collection authority ever points at this account or at the admin key.
#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub bump: u8,
}
