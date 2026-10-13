use anchor_lang::prelude::*;

#[error_code]
pub enum FundraError {
    #[msg("Campaign is not in the state required for this instruction")]
    InvalidCampaignStatus,
    #[msg("Campaign deadline has passed")]
    DeadlinePassed,
    #[msg("Campaign deadline has not been reached yet")]
    DeadlineNotReached,
    #[msg("Invalid deadline for this campaign")]
    InvalidDeadline,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Contribution would exceed the campaign's max funding")]
    MaxFundingExceeded,
    #[msg("Goal must be greater than zero and not above max funding")]
    InvalidGoal,
    #[msg("Reward rate denominator must be non-zero")]
    InvalidRewardRate,
    #[msg("Milestone count must be between 1 and the maximum")]
    InvalidMilestoneCount,
    #[msg("Milestone percentages must each be non-zero and sum to 100")]
    InvalidMilestonePercentages,
    #[msg("Token account mint does not match the campaign contribution mint")]
    WrongMint,
    #[msg("Token account is not owned by the expected wallet")]
    WrongTokenOwner,
    #[msg("Mints with a freeze authority are not accepted")]
    MintHasFreezeAuthority,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Signer is not authorised for this action")]
    Unauthorized,
    #[msg("Name or URI is too long")]
    StringTooLong,
    #[msg("Proof reference is empty or too long")]
    InvalidProofRef,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Refunds are not allowed once milestone funds have been released")]
    FundsAlreadyReleased,
    #[msg("Milestone index is not the current milestone")]
    WrongMilestoneIndex,
    #[msg("Milestone is not in the state required for this instruction")]
    InvalidMilestoneStatus,
    #[msg("Voting window for this milestone has closed")]
    VotingClosed,
    #[msg("Voting is still open and the outcome is not yet decided")]
    VotingStillOpen,
    #[msg("Contributor has already voted on this milestone")]
    AlreadyVoted,
    #[msg("Contributor has no voting weight")]
    NoVotingWeight,
    #[msg("Milestone account is required for this milestone")]
    MilestoneAccountRequired,
    #[msg("Milestone funds have already been claimed")]
    AlreadyClaimed,
    #[msg("All milestone tranches must be released before completing")]
    MilestonesIncomplete,
    #[msg("No reward available to claim")]
    NothingToClaim,
    #[msg("Reward supply cap would be exceeded")]
    RewardCapExceeded,
    #[msg("Account does not belong to this campaign")]
    CampaignMismatch,
}
