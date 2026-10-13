use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Gi3TATmmgMsCAZadWqHBa8sJw6YxHa9fuYaQHcK4Ks8D");

// SECURITY NOTE: in production the program's upgrade authority must be a multisig
// (for example Squads) or revoked entirely (`solana program set-upgrade-authority --final`).
// A single hot key that can upgrade this program can replace every rule enforced below,
// including the vault authority's signing logic. On Devnet the deployer key is the
// upgrade authority for convenience only.
#[program]
pub mod fundra {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        instructions::initialize_platform::initialize_platform_handler(ctx)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        name: String,
        uri: String,
        goal: u64,
        max_funding: u64,
        deadline: i64,
        reward_rate_numerator: u64,
        reward_rate_denominator: u64,
        milestone_percentages: Vec<u8>,
    ) -> Result<()> {
        instructions::create_campaign::create_campaign_handler(
            ctx,
            campaign_id,
            name,
            uri,
            goal,
            max_funding,
            deadline,
            reward_rate_numerator,
            reward_rate_denominator,
            milestone_percentages,
        )
    }

    pub fn update_campaign(
        ctx: Context<UpdateCampaign>,
        goal: u64,
        max_funding: u64,
        deadline: i64,
        reward_rate_numerator: u64,
        reward_rate_denominator: u64,
        milestone_percentages: Vec<u8>,
    ) -> Result<()> {
        instructions::update_campaign::update_campaign_handler(
            ctx,
            goal,
            max_funding,
            deadline,
            reward_rate_numerator,
            reward_rate_denominator,
            milestone_percentages,
        )
    }

    pub fn activate_campaign(ctx: Context<ActivateCampaign>) -> Result<()> {
        instructions::activate_campaign::activate_campaign_handler(ctx)
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        instructions::contribute::contribute_handler(ctx, amount)
    }

    pub fn finalize_campaign(ctx: Context<FinalizeCampaign>) -> Result<()> {
        instructions::finalize_campaign::finalize_campaign_handler(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund::claim_refund_handler(ctx)
    }

    pub fn submit_milestone(
        ctx: Context<SubmitMilestone>,
        milestone_index: u8,
        proof_ref: String,
    ) -> Result<()> {
        instructions::submit_milestone::submit_milestone_handler(ctx, milestone_index, proof_ref)
    }

    pub fn vote_milestone(
        ctx: Context<VoteMilestone>,
        milestone_index: u8,
        approve: bool,
    ) -> Result<()> {
        instructions::vote_milestone::vote_milestone_handler(ctx, milestone_index, approve)
    }

    pub fn finalize_milestone(ctx: Context<FinalizeMilestone>, milestone_index: u8) -> Result<()> {
        instructions::finalize_milestone::finalize_milestone_handler(ctx, milestone_index)
    }

    pub fn claim_milestone_funds(
        ctx: Context<ClaimMilestoneFunds>,
        milestone_index: u8,
    ) -> Result<()> {
        instructions::claim_milestone_funds::claim_milestone_funds_handler(ctx, milestone_index)
    }

    pub fn complete_campaign(ctx: Context<CompleteCampaign>) -> Result<()> {
        instructions::complete_campaign::complete_campaign_handler(ctx)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        instructions::claim_reward::claim_reward_handler(ctx)
    }
}
