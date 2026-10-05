# Fundra

Fundra is a contributor-first crowdfunding protocol built on **Solana Devnet**. It replaces traditional crowdfunding with programmable escrow, milestone-based fund releases, contributor voting, permissionless refunds, receipt NFTs, and campaign-specific reward tokens.

Instead of sending funds directly to a campaign creator, contributions are deposited into a **PDA-controlled escrow vault**. The maker can only access funds gradually as predefined milestones are completed and approved by contributors.

Each campaign chooses its own **Devnet SPL token** as the contribution currency. Contributors receive an on-chain position, a non-transferable **Metaplex Core receipt NFT** as proof of contribution, and a pending allocation of the campaign's reward token.

If a campaign fails to reach its funding goal before the deadline, contributors can claim their funds back directly from the protocol. If the campaign succeeds, contributors vote on milestone submissions and approved portions of the escrowed funds are released to the maker.

## Core Features

- PDA-controlled escrow for campaign funds
- Any classic Devnet SPL token as the contribution currency
- Funding goals, caps, and deadlines enforced on-chain
- Immutable campaign terms after activation
- Milestone-based fund releases
- Contribution-weighted milestone voting
- Permissionless refunds for failed campaigns
- Non-transferable Metaplex Core receipt NFTs
- Campaign-specific SPL reward tokens
- PDA-controlled reward mint authority
- Maker and contributor reputation
- Transparent and verifiable on-chain campaign state

## Campaign Lifecycle

`DRAFT → ACTIVE → FUNDED → MILESTONES → COMPLETED`

If the funding goal is not reached:

`ACTIVE → FAILED → REFUNDS`

## Why Fundra?

Traditional crowdfunding often requires contributors to trust that a creator will use their funds as promised. Fundra reduces that trust requirement by enforcing campaign rules directly through a Solana program.

Funds stay locked in escrow, milestones control withdrawals, contributors participate in approvals, and failed campaigns support permissionless refunds.

> **Fundra replaces "send money and hope" with programmable escrow.**
