/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fundra.json`.
 */
export type Fundra = {
  "address": "Gi3TATmmgMsCAZadWqHBa8sJw6YxHa9fuYaQHcK4Ks8D",
  "metadata": {
    "name": "fundra",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Fundra: milestone-gated crowdfunding escrow on Solana (Devnet)"
  },
  "instructions": [
    {
      "name": "activateCampaign",
      "discriminator": [
        17,
        214,
        3,
        27,
        91,
        67,
        44,
        171
      ],
      "accounts": [
        {
          "name": "maker",
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "claimMilestoneFunds",
      "discriminator": [
        13,
        171,
        126,
        8,
        115,
        135,
        234,
        17
      ],
      "accounts": [
        {
          "name": "maker",
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "milestone",
          "docs": [
            "Required for milestones 1 and up. Omitted (program id placeholder) for milestone 0,",
            "which needs no vote."
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "contributionMint"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "makerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "milestoneIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "claimRefund",
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "contributorPosition",
          "writable": true
        },
        {
          "name": "contributionMint"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "contributorTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claimReward",
      "discriminator": [
        149,
        95,
        181,
        242,
        94,
        90,
        158,
        162
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "contributorPosition",
          "writable": true
        },
        {
          "name": "rewardMint",
          "writable": true
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "contributorRewardAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "completeCampaign",
      "discriminator": [
        238,
        164,
        40,
        81,
        211,
        55,
        55,
        26
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Permissionless on purpose: completion is a pure function of on-chain state, and",
            "contributors' rewards must not depend on the maker remembering to call it."
          ],
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "contribute",
      "discriminator": [
        82,
        33,
        68,
        131,
        32,
        0,
        205,
        95
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "contributorPosition",
          "writable": true
        },
        {
          "name": "contributionMint"
        },
        {
          "name": "contributorTokenAccount",
          "docs": [
            "Source must hold the campaign's contribution mint and be owned (and signed for)",
            "by the contributor."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "coreCollection",
          "writable": true
        },
        {
          "name": "receiptAsset",
          "docs": [
            "Fresh keypair from the client. Only used on a contributor's first contribution",
            "(when the receipt is minted); for later contributions pass any unused keypair."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mplCoreProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createCampaign",
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig"
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "contributionMint",
          "docs": [
            "The single contribution currency. Must be a classic SPL Token mint (the",
            "`Account<Mint>` owner check rejects Token-2022) with no freeze authority."
          ]
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "mint, and update authority of the Core collection. It only ever signs inside this program."
          ]
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "rewardMint",
          "docs": [
            "Reward mint: same decimals as the contribution mint, mint authority is the vault",
            "authority PDA, and no freeze authority."
          ],
          "writable": true
        },
        {
          "name": "coreCollection",
          "docs": [
            "New keypair generated by the client; becomes the per-campaign Core collection."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mplCoreProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "campaignId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "goal",
          "type": "u64"
        },
        {
          "name": "maxFunding",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "rewardRateNumerator",
          "type": "u64"
        },
        {
          "name": "rewardRateDenominator",
          "type": "u64"
        },
        {
          "name": "milestonePercentages",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "finalizeCampaign",
      "discriminator": [
        241,
        76,
        201,
        221,
        33,
        222,
        220,
        138
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone may finalize once the deadline has passed; the outcome is fully determined on-chain."
          ],
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "finalizeMilestone",
      "discriminator": [
        7,
        134,
        89,
        13,
        34,
        31,
        108,
        149
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone may finalize; the result is a pure function of on-chain state."
          ],
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "milestone",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "milestoneIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "submitMilestone",
      "discriminator": [
        35,
        96,
        220,
        215,
        102,
        83,
        139,
        52
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "milestone",
          "docs": [
            "One account per milestone index; `init` makes a second submission for the same",
            "index impossible, so a rejected milestone cannot be silently retried."
          ],
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "milestoneIndex",
          "type": "u8"
        },
        {
          "name": "proofRef",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateCampaign",
      "discriminator": [
        235,
        31,
        39,
        49,
        121,
        173,
        19,
        92
      ],
      "accounts": [
        {
          "name": "maker",
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "goal",
          "type": "u64"
        },
        {
          "name": "maxFunding",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "rewardRateNumerator",
          "type": "u64"
        },
        {
          "name": "rewardRateDenominator",
          "type": "u64"
        },
        {
          "name": "milestonePercentages",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "voteMilestone",
      "discriminator": [
        43,
        27,
        71,
        239,
        231,
        20,
        102,
        156
      ],
      "accounts": [
        {
          "name": "contributor",
          "signer": true
        },
        {
          "name": "campaign"
        },
        {
          "name": "contributorPosition",
          "writable": true
        },
        {
          "name": "milestone",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "milestoneIndex",
          "type": "u8"
        },
        {
          "name": "approve",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "contributorPosition",
      "discriminator": [
        40,
        228,
        218,
        155,
        41,
        181,
        187,
        148
      ]
    },
    {
      "name": "milestone",
      "discriminator": [
        38,
        210,
        239,
        177,
        85,
        184,
        10,
        44
      ]
    },
    {
      "name": "platformConfig",
      "discriminator": [
        160,
        78,
        128,
        0,
        248,
        83,
        230,
        160
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidCampaignStatus",
      "msg": "Campaign is not in the state required for this instruction"
    },
    {
      "code": 6001,
      "name": "deadlinePassed",
      "msg": "Campaign deadline has passed"
    },
    {
      "code": 6002,
      "name": "deadlineNotReached",
      "msg": "Campaign deadline has not been reached yet"
    },
    {
      "code": 6003,
      "name": "invalidDeadline",
      "msg": "Invalid deadline for this campaign"
    },
    {
      "code": 6004,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6005,
      "name": "maxFundingExceeded",
      "msg": "Contribution would exceed the campaign's max funding"
    },
    {
      "code": 6006,
      "name": "invalidGoal",
      "msg": "Goal must be greater than zero and not above max funding"
    },
    {
      "code": 6007,
      "name": "invalidRewardRate",
      "msg": "Reward rate denominator must be non-zero"
    },
    {
      "code": 6008,
      "name": "invalidMilestoneCount",
      "msg": "Milestone count must be between 1 and the maximum"
    },
    {
      "code": 6009,
      "name": "invalidMilestonePercentages",
      "msg": "Milestone percentages must each be non-zero and sum to 100"
    },
    {
      "code": 6010,
      "name": "wrongMint",
      "msg": "Token account mint does not match the campaign contribution mint"
    },
    {
      "code": 6011,
      "name": "wrongTokenOwner",
      "msg": "Token account is not owned by the expected wallet"
    },
    {
      "code": 6012,
      "name": "mintHasFreezeAuthority",
      "msg": "Mints with a freeze authority are not accepted"
    },
    {
      "code": 6013,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6014,
      "name": "unauthorized",
      "msg": "Signer is not authorised for this action"
    },
    {
      "code": 6015,
      "name": "stringTooLong",
      "msg": "Name or URI is too long"
    },
    {
      "code": 6016,
      "name": "invalidProofRef",
      "msg": "Proof reference is empty or too long"
    },
    {
      "code": 6017,
      "name": "nothingToRefund",
      "msg": "Nothing to refund"
    },
    {
      "code": 6018,
      "name": "fundsAlreadyReleased",
      "msg": "Refunds are not allowed once milestone funds have been released"
    },
    {
      "code": 6019,
      "name": "wrongMilestoneIndex",
      "msg": "Milestone index is not the current milestone"
    },
    {
      "code": 6020,
      "name": "invalidMilestoneStatus",
      "msg": "Milestone is not in the state required for this instruction"
    },
    {
      "code": 6021,
      "name": "votingClosed",
      "msg": "Voting window for this milestone has closed"
    },
    {
      "code": 6022,
      "name": "votingStillOpen",
      "msg": "Voting is still open and the outcome is not yet decided"
    },
    {
      "code": 6023,
      "name": "alreadyVoted",
      "msg": "Contributor has already voted on this milestone"
    },
    {
      "code": 6024,
      "name": "noVotingWeight",
      "msg": "Contributor has no voting weight"
    },
    {
      "code": 6025,
      "name": "milestoneAccountRequired",
      "msg": "Milestone account is required for this milestone"
    },
    {
      "code": 6026,
      "name": "alreadyClaimed",
      "msg": "Milestone funds have already been claimed"
    },
    {
      "code": 6027,
      "name": "milestonesIncomplete",
      "msg": "All milestone tranches must be released before completing"
    },
    {
      "code": 6028,
      "name": "nothingToClaim",
      "msg": "No reward available to claim"
    },
    {
      "code": 6029,
      "name": "rewardCapExceeded",
      "msg": "Reward supply cap would be exceeded"
    },
    {
      "code": 6030,
      "name": "campaignMismatch",
      "msg": "Account does not belong to this campaign"
    }
  ],
  "types": [
    {
      "name": "campaign",
      "docs": [
        "Seeds: [\"campaign\", maker, campaign_id (u64 LE)]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "campaignId",
            "type": "u64"
          },
          {
            "name": "contributionMint",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "goal",
            "type": "u64"
          },
          {
            "name": "maxFunding",
            "type": "u64"
          },
          {
            "name": "amountRaised",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "campaignStatus"
              }
            }
          },
          {
            "name": "rewardMint",
            "type": "pubkey"
          },
          {
            "name": "rewardRateNumerator",
            "type": "u64"
          },
          {
            "name": "rewardRateDenominator",
            "type": "u64"
          },
          {
            "name": "rewardSupplyCap",
            "type": "u64"
          },
          {
            "name": "tokensMinted",
            "type": "u64"
          },
          {
            "name": "currentMilestone",
            "docs": [
              "Index of the next tranche to release. Starts at 0 (the no-vote upfront tranche)."
            ],
            "type": "u8"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "milestonePercentages",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "fundsReleased",
            "type": "u64"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "coreCollection",
            "type": "pubkey"
          },
          {
            "name": "contributorCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "campaignStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "draft"
          },
          {
            "name": "active"
          },
          {
            "name": "funded"
          },
          {
            "name": "milestones"
          },
          {
            "name": "completed"
          },
          {
            "name": "failed"
          }
        ]
      }
    },
    {
      "name": "contributorPosition",
      "docs": [
        "Seeds: [\"contributor\", campaign, contributor]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amountContributed",
            "type": "u64"
          },
          {
            "name": "amountRefunded",
            "type": "u64"
          },
          {
            "name": "rewardEntitlement",
            "docs": [
              "Pending reward in reward-mint base units. Not minted until the campaign is COMPLETED."
            ],
            "type": "u64"
          },
          {
            "name": "rewardClaimed",
            "type": "u64"
          },
          {
            "name": "receiptNft",
            "type": "pubkey"
          },
          {
            "name": "votes",
            "docs": [
              "One vote per contributor per milestone."
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "voteRecord"
                  }
                },
                8
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "milestone",
      "docs": [
        "Seeds: [\"milestone\", campaign, index (u8)]",
        "Created when the maker submits proof. Before that the milestone is implicitly PENDING."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "milestoneStatus"
              }
            }
          },
          {
            "name": "proofRef",
            "docs": [
              "Off-chain identifier only (for example an IPFS CID). Nothing on-chain trusts its content."
            ],
            "type": "string"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "votingDeadline",
            "type": "i64"
          },
          {
            "name": "approveWeight",
            "type": "u64"
          },
          {
            "name": "rejectWeight",
            "type": "u64"
          },
          {
            "name": "fundsClaimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "milestoneStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "underReview"
          },
          {
            "name": "approved"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "platformConfig",
      "docs": [
        "Platform-wide admin settings. The admin never custodies funds: no vault, mint",
        "or collection authority ever points at this account or at the admin key."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "approve"
          },
          {
            "name": "reject"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "approvalThresholdBps",
      "docs": [
        "A milestone is approved only if approve weight is STRICTLY MORE than this share",
        "of the weight cast (5_000 bps = more than 50%)."
      ],
      "type": "u64",
      "value": "5000"
    },
    {
      "name": "bpsDenominator",
      "docs": [
        "Basis-point denominator used for threshold maths."
      ],
      "type": "u64",
      "value": "10000"
    },
    {
      "name": "campaignSeed",
      "type": "bytes",
      "value": "[99, 97, 109, 112, 97, 105, 103, 110]"
    },
    {
      "name": "contributorSeed",
      "type": "bytes",
      "value": "[99, 111, 110, 116, 114, 105, 98, 117, 116, 111, 114]"
    },
    {
      "name": "maxCampaignDurationSeconds",
      "docs": [
        "Longest allowed campaign length (365 days)."
      ],
      "type": "i64",
      "value": "31536000"
    },
    {
      "name": "milestonePercentTotal",
      "docs": [
        "Milestone percentages must sum to exactly this value."
      ],
      "type": "u8",
      "value": "100"
    },
    {
      "name": "milestoneSeed",
      "type": "bytes",
      "value": "[109, 105, 108, 101, 115, 116, 111, 110, 101]"
    },
    {
      "name": "minCampaignDurationSeconds",
      "docs": [
        "Shortest allowed campaign length. Kept tiny so Devnet tests can run quickly;",
        "raise it (for example to one day) before any production use."
      ],
      "type": "i64",
      "value": "5"
    },
    {
      "name": "platformConfigSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 116, 102, 111, 114, 109, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "quorumBps",
      "docs": [
        "Quorum: total weight cast must be at least this share of `amount_raised`",
        "(2_000 bps = 20%). If quorum is not reached by the voting deadline the",
        "milestone is rejected."
      ],
      "type": "u64",
      "value": "2000"
    },
    {
      "name": "rewardMintSeed",
      "type": "bytes",
      "value": "[114, 101, 119, 97, 114, 100, 95, 109, 105, 110, 116]"
    },
    {
      "name": "upfrontMilestoneIndex",
      "docs": [
        "Index of the first milestone. It releases without a vote once the campaign is FUNDED."
      ],
      "type": "u8",
      "value": "0"
    },
    {
      "name": "vaultAuthoritySeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    },
    {
      "name": "votingPeriodSeconds",
      "docs": [
        "How long contributors can vote after a milestone is submitted (7 days)."
      ],
      "type": "i64",
      "value": "604800"
    }
  ]
};
