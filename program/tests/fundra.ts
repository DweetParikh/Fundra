import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import { Fundra } from "../target/types/fundra";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.fundra as Program<Fundra>;
const connection = provider.connection;
const payer = (provider.wallet as anchor.Wallet).payer;

const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
const UNIT = 1_000_000; // 6 decimals
const DECIMALS = 6;
const CAMPAIGN_SECONDS = 12;

// Seeds mirror constants.rs.
const enc = (s: string) => Buffer.from(s);
const pda = (seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, program.programId)[0];
const u64le = (n: BN) => n.toArrayLike(Buffer, "le", 8);

const platformConfigPda = () => pda([enc("platform_config")]);
const campaignPda = (maker: PublicKey, id: BN) =>
  pda([enc("campaign"), maker.toBuffer(), u64le(id)]);
const vaultAuthorityPda = (campaign: PublicKey) => pda([enc("vault_authority"), campaign.toBuffer()]);
const vaultPda = (campaign: PublicKey) => pda([enc("vault"), campaign.toBuffer()]);
const rewardMintPda = (campaign: PublicKey) => pda([enc("reward_mint"), campaign.toBuffer()]);
const positionPda = (campaign: PublicKey, contributor: PublicKey) =>
  pda([enc("contributor"), campaign.toBuffer(), contributor.toBuffer()]);
const milestonePda = (campaign: PublicKey, index: number) =>
  pda([enc("milestone"), campaign.toBuffer(), Buffer.from([index])]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const statusKey = (s: any) => Object.keys(s)[0];
const cu = (units = 400_000) => [ComputeBudgetProgram.setComputeUnitLimit({ units })];

async function chainTime(): Promise<number> {
  const slot = await connection.getSlot("confirmed");
  return (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);
}

async function waitUntilChainTime(ts: number) {
  while ((await chainTime()) <= ts + 1) await sleep(500);
}

async function fundedKeypair(sol = 5): Promise<Keypair> {
  const kp = Keypair.generate();
  const sig = await connection.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  return kp;
}

async function expectError(p: Promise<unknown>, name: string) {
  try {
    await p;
  } catch (e: any) {
    const code = e?.error?.errorCode?.code;
    const text = `${code ?? ""} ${e?.message ?? ""} ${(e?.logs ?? []).join(" ")}`;
    assert.isTrue(
      code === name || text.includes(name),
      `expected error ${name}, got: ${text.slice(0, 400)}`
    );
    return;
  }
  assert.fail(`expected error ${name} but the call succeeded`);
}

let idCounter = Date.now();
const nextId = () => new BN(idCounter++);

interface Ctx {
  maker: Keypair;
  id: BN;
  campaign: PublicKey;
  vault: PublicKey;
  vaultAuthority: PublicKey;
  rewardMint: PublicKey;
  collection: Keypair;
  mint: PublicKey;
  deadline: number;
  makerAta: PublicKey;
}

async function newMint(): Promise<PublicKey> {
  return createMint(connection, payer, payer.publicKey, null, DECIMALS);
}

async function createCampaign(opts: {
  mint: PublicKey;
  goal: number;
  maxFunding: number;
  percentages: number[];
  rateNum?: number;
  rateDen?: number;
  seconds?: number;
}): Promise<Ctx> {
  const maker = await fundedKeypair();
  const id = nextId();
  const campaign = campaignPda(maker.publicKey, id);
  const collection = Keypair.generate();
  const deadline = (await chainTime()) + (opts.seconds ?? CAMPAIGN_SECONDS);
  await program.methods
    .createCampaign(
      id,
      "Test Campaign",
      "https://example.invalid/meta.json",
      new BN(opts.goal),
      new BN(opts.maxFunding),
      new BN(deadline),
      new BN(opts.rateNum ?? 2),
      new BN(opts.rateDen ?? 1),
      Buffer.from(opts.percentages)
    )
    .accounts({
      maker: maker.publicKey,
      platformConfig: platformConfigPda(),
      campaign,
      contributionMint: opts.mint,
      vaultAuthority: vaultAuthorityPda(campaign),
      vault: vaultPda(campaign),
      rewardMint: rewardMintPda(campaign),
      coreCollection: collection.publicKey,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(cu())
    .signers([maker, collection])
    .rpc();
  const makerAta = (await getOrCreateAssociatedTokenAccount(connection, payer, opts.mint, maker.publicKey)).address;
  return {
    maker,
    id,
    campaign,
    vault: vaultPda(campaign),
    vaultAuthority: vaultAuthorityPda(campaign),
    rewardMint: rewardMintPda(campaign),
    collection,
    mint: opts.mint,
    deadline,
    makerAta,
  };
}

const activate = (c: Ctx) =>
  program.methods
    .activateCampaign()
    .accounts({ maker: c.maker.publicKey, campaign: c.campaign })
    .signers([c.maker])
    .rpc();

async function makeContributor(c: Ctx, tokens: number) {
  const kp = await fundedKeypair();
  const ata = (await getOrCreateAssociatedTokenAccount(connection, payer, c.mint, kp.publicKey)).address;
  await mintTo(connection, payer, c.mint, ata, payer, tokens * UNIT);
  return { kp, ata };
}

async function contribute(
  c: Ctx,
  who: { kp: Keypair; ata: PublicKey },
  tokens: number,
  overrides: { sourceAta?: PublicKey } = {}
) {
  const receiptAsset = Keypair.generate();
  await program.methods
    .contribute(new BN(tokens * UNIT))
    .accounts({
      contributor: who.kp.publicKey,
      campaign: c.campaign,
      contributorPosition: positionPda(c.campaign, who.kp.publicKey),
      contributionMint: c.mint,
      contributorTokenAccount: overrides.sourceAta ?? who.ata,
      vault: c.vault,
      vaultAuthority: c.vaultAuthority,
      coreCollection: c.collection.publicKey,
      receiptAsset: receiptAsset.publicKey,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(cu())
    .signers([who.kp, receiptAsset])
    .rpc();
  return receiptAsset.publicKey;
}

const finalizeCampaign = (c: Ctx, caller: Keypair) =>
  program.methods
    .finalizeCampaign()
    .accounts({ caller: caller.publicKey, campaign: c.campaign })
    .signers([caller])
    .rpc();

const claimMilestone = (c: Ctx, index: number, maker: Keypair = c.maker, withAccount = index > 0) =>
  program.methods
    .claimMilestoneFunds(index)
    .accounts({
      maker: maker.publicKey,
      campaign: c.campaign,
      milestone: withAccount ? milestonePda(c.campaign, index) : null,
      contributionMint: c.mint,
      vault: c.vault,
      vaultAuthority: c.vaultAuthority,
      makerTokenAccount: c.makerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([maker])
    .rpc();

const submitMilestone = (c: Ctx, index: number, proof = "bafybeigdyrztest") =>
  program.methods
    .submitMilestone(index, proof)
    .accounts({
      maker: c.maker.publicKey,
      campaign: c.campaign,
      milestone: milestonePda(c.campaign, index),
      systemProgram: SystemProgram.programId,
    })
    .signers([c.maker])
    .rpc();

const vote = (c: Ctx, who: { kp: Keypair }, index: number, approve: boolean) =>
  program.methods
    .voteMilestone(index, approve)
    .accounts({
      contributor: who.kp.publicKey,
      campaign: c.campaign,
      contributorPosition: positionPda(c.campaign, who.kp.publicKey),
      milestone: milestonePda(c.campaign, index),
    })
    .signers([who.kp])
    .rpc();

const finalizeMilestone = (c: Ctx, caller: Keypair, index: number) =>
  program.methods
    .finalizeMilestone(index)
    .accounts({
      caller: caller.publicKey,
      campaign: c.campaign,
      milestone: milestonePda(c.campaign, index),
    })
    .signers([caller])
    .rpc();

const completeCampaign = (c: Ctx, caller: Keypair) =>
  program.methods
    .completeCampaign()
    .accounts({ caller: caller.publicKey, campaign: c.campaign })
    .signers([caller])
    .rpc();

const claimReward = (c: Ctx, who: { kp: Keypair }) =>
  program.methods
    .claimReward()
    .accounts({
      contributor: who.kp.publicKey,
      campaign: c.campaign,
      contributorPosition: positionPda(c.campaign, who.kp.publicKey),
      rewardMint: c.rewardMint,
      vaultAuthority: c.vaultAuthority,
      contributorRewardAccount: getAssociatedTokenAddressSync(c.rewardMint, who.kp.publicKey),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([who.kp])
    .rpc();

const claimRefund = (c: Ctx, who: { kp: Keypair; ata: PublicKey }) =>
  program.methods
    .claimRefund()
    .accounts({
      contributor: who.kp.publicKey,
      campaign: c.campaign,
      contributorPosition: positionPda(c.campaign, who.kp.publicKey),
      contributionMint: c.mint,
      vault: c.vault,
      vaultAuthority: c.vaultAuthority,
      contributorTokenAccount: who.ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([who.kp])
    .rpc();

const bal = async (ata: PublicKey) => Number((await getAccount(connection, ata)).amount);

describe("fundra", () => {
  let mint: PublicKey;

  before(async () => {
    mint = await newMint();
    if (!(await connection.getAccountInfo(platformConfigPda()))) {
      await program.methods
        .initializePlatform()
        .accounts({
          admin: provider.wallet.publicKey,
          platformConfig: platformConfigPda(),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }
    const cfg = await program.account.platformConfig.fetch(platformConfigPda());
    assert.equal(cfg.admin.toBase58(), provider.wallet.publicKey.toBase58());
  });

  it("happy path: create, activate, contribute, finalize, milestone cycle, reward claim", async () => {
    const c = await createCampaign({
      mint,
      goal: 100 * UNIT,
      maxFunding: 200 * UNIT,
      percentages: [20, 30, 20, 30],
      rateNum: 2,
      rateDen: 1,
    });

    // Vault authority is the PDA; vault and reward mint are PDA-controlled.
    const vaultAcc = await getAccount(connection, c.vault);
    assert.equal(vaultAcc.owner.toBase58(), c.vaultAuthority.toBase58());
    const rm = await connection.getParsedAccountInfo(c.rewardMint);
    const rmInfo: any = (rm.value!.data as any).parsed.info;
    assert.equal(rmInfo.mintAuthority, c.vaultAuthority.toBase58());
    assert.isNull(rmInfo.freezeAuthority);

    // Not contributable before activation.
    const a = await makeContributor(c, 100);
    const b = await makeContributor(c, 100);
    await expectError(contribute(c, a, 10), "InvalidCampaignStatus");

    await activate(c);
    const rcptA = await contribute(c, a, 60);
    await contribute(c, b, 60);
    // Second contribution from the same wallet adds to the same position, no new receipt.
    await contribute(c, a, 1);

    const posA = await program.account.contributorPosition.fetch(positionPda(c.campaign, a.kp.publicKey));
    assert.equal(posA.amountContributed.toNumber(), 61 * UNIT);
    assert.equal(posA.rewardEntitlement.toNumber(), 122 * UNIT);
    assert.equal(posA.receiptNft.toBase58(), rcptA.toBase58());
    const receiptInfo = await connection.getAccountInfo(rcptA);
    assert.equal(receiptInfo!.owner.toBase58(), MPL_CORE_PROGRAM_ID.toBase58());

    // Pending reward only: nothing minted yet.
    const camp0 = await program.account.campaign.fetch(c.campaign);
    assert.equal(camp0.tokensMinted.toNumber(), 0);
    assert.equal(camp0.amountRaised.toNumber(), 121 * UNIT);
    assert.equal(await bal(c.vault), 121 * UNIT);

    // Cannot finalize before deadline.
    await expectError(finalizeCampaign(c, a.kp), "DeadlineNotReached");

    await waitUntilChainTime(c.deadline);
    await finalizeCampaign(c, a.kp);
    assert.equal(statusKey((await program.account.campaign.fetch(c.campaign)).status), "funded");

    // Non-maker cannot claim.
    await expectError(claimMilestone(c, 0, a.kp, false), "Unauthorized");

    // Milestone 0 (20%) releases without a vote.
    const raised = 121 * UNIT;
    await claimMilestone(c, 0);
    let released = Math.floor((raised * 20) / 100);
    assert.equal(await bal(c.makerAta), released);
    assert.equal(statusKey((await program.account.campaign.fetch(c.campaign)).status), "milestones");
    // Claiming milestone 0 twice is impossible (current_milestone advanced).
    await expectError(claimMilestone(c, 0, c.maker, false), "WrongMilestoneIndex");

    // Maker cannot withdraw milestone 1 before submission or approval.
    await expectError(claimMilestone(c, 1, c.maker, false), "MilestoneAccountRequired");

    const pcts = [20, 30, 20, 30];
    for (const idx of [1, 2, 3]) {
      await submitMilestone(c, idx);
      // Under review: still cannot withdraw.
      await expectError(claimMilestone(c, idx), "InvalidMilestoneStatus");
      // Cannot finalize while the vote is undecided.
      await expectError(finalizeMilestone(c, a.kp, idx), "VotingStillOpen");
      await vote(c, a, idx, true);
      // One vote per contributor per milestone.
      await expectError(vote(c, a, idx, true), "AlreadyVoted");
      await vote(c, b, idx, true);
      await finalizeMilestone(c, a.kp, idx);
      const m = await program.account.milestone.fetch(milestonePda(c.campaign, idx));
      assert.equal(statusKey(m.status), "approved");

      const before = await bal(c.makerAta);
      await claimMilestone(c, idx);
      const got = (await bal(c.makerAta)) - before;
      const expected =
        idx === 3 ? raised - released : Math.floor((raised * pcts[idx]) / 100);
      assert.equal(got, expected, `tranche ${idx}`);
      released += got;
      // Double claim of the same tranche fails.
      await expectError(claimMilestone(c, idx), "WrongMilestoneIndex");
    }
    assert.equal(released, raised);
    assert.equal(await bal(c.vault), 0);

    // Rewards are locked until COMPLETED.
    await expectError(claimReward(c, a), "InvalidCampaignStatus");

    await completeCampaign(c, a.kp);
    assert.equal(statusKey((await program.account.campaign.fetch(c.campaign)).status), "completed");

    // Reward claim: PDA signs a mint to the contributor's reward account.
    await claimReward(c, a);
    await claimReward(c, b);
    assert.equal(
      await bal(getAssociatedTokenAddressSync(c.rewardMint, a.kp.publicKey)),
      122 * UNIT
    );
    assert.equal(
      await bal(getAssociatedTokenAddressSync(c.rewardMint, b.kp.publicKey)),
      120 * UNIT
    );
    const camp = await program.account.campaign.fetch(c.campaign);
    assert.equal(camp.tokensMinted.toNumber(), 242 * UNIT);
    assert.isAtMost(camp.tokensMinted.toNumber(), camp.rewardSupplyCap.toNumber());

    // Double reward claim rejected.
    await expectError(claimReward(c, a), "NothingToClaim");

    // Refunds are not available on a completed campaign.
    await expectError(claimRefund(c, a), "InvalidCampaignStatus");
  });

  it("failure path: goal missed, refunds paid from the vault, double refund rejected", async () => {
    const c = await createCampaign({
      mint,
      goal: 100 * UNIT,
      maxFunding: 200 * UNIT,
      percentages: [20, 30, 50],
    });
    const a = await makeContributor(c, 100);
    await activate(c);
    await contribute(c, a, 30);
    assert.equal(await bal(a.ata), 70 * UNIT);

    // No refund on an active campaign.
    await expectError(claimRefund(c, a), "InvalidCampaignStatus");

    await waitUntilChainTime(c.deadline);

    // No contribution after the deadline.
    const late = await makeContributor(c, 10);
    await expectError(contribute(c, late, 5), "DeadlinePassed");

    await finalizeCampaign(c, a.kp);
    assert.equal(statusKey((await program.account.campaign.fetch(c.campaign)).status), "failed");

    // Maker cannot touch the vault of a failed campaign.
    await expectError(claimMilestone(c, 0, c.maker, false), "InvalidCampaignStatus");

    await claimRefund(c, a);
    assert.equal(await bal(a.ata), 100 * UNIT);
    assert.equal(await bal(c.vault), 0);

    const pos = await program.account.contributorPosition.fetch(positionPda(c.campaign, a.kp.publicKey));
    assert.equal(pos.amountRefunded.toNumber(), 30 * UNIT);
    assert.equal(pos.rewardEntitlement.toNumber(), 0, "pending reward cancelled");

    // Double refund rejected.
    await expectError(claimRefund(c, a), "NothingToRefund");
    // Reward cannot be claimed on a failed campaign.
    await expectError(claimReward(c, a), "InvalidCampaignStatus");
  });

  it("rejects a contribution from a token account of the wrong mint", async () => {
    const c = await createCampaign({ mint, goal: 10 * UNIT, maxFunding: 50 * UNIT, percentages: [100] });
    await activate(c);
    const other = await newMint();
    const kp = await fundedKeypair();
    const wrongAta = (await getOrCreateAssociatedTokenAccount(connection, payer, other, kp.publicKey)).address;
    await mintTo(connection, payer, other, wrongAta, payer, 20 * UNIT);
    await expectError(contribute(c, { kp, ata: wrongAta }, 5), "WrongMint");
    assert.equal(await bal(c.vault), 0);
  });

  it("rejects a contribution that exceeds max funding", async () => {
    const c = await createCampaign({ mint, goal: 40 * UNIT, maxFunding: 50 * UNIT, percentages: [100] });
    await activate(c);
    const a = await makeContributor(c, 100);
    await contribute(c, a, 30);
    await expectError(contribute(c, a, 21), "MaxFundingExceeded");
    await contribute(c, a, 20); // exactly at the cap is fine
    assert.equal((await program.account.campaign.fetch(c.campaign)).amountRaised.toNumber(), 50 * UNIT);
  });

  it("rejects a mint with a freeze authority and invalid terms", async () => {
    const frozenMint = await createMint(connection, payer, payer.publicKey, payer.publicKey, DECIMALS);
    await expectError(createCampaign({ mint: frozenMint, goal: UNIT, maxFunding: UNIT, percentages: [100] }), "MintHasFreezeAuthority");
    await expectError(createCampaign({ mint, goal: UNIT, maxFunding: UNIT, percentages: [20, 30, 40] }), "InvalidMilestonePercentages");
    await expectError(createCampaign({ mint, goal: 2 * UNIT, maxFunding: UNIT, percentages: [100] }), "InvalidGoal");
    await expectError(createCampaign({ mint, goal: UNIT, maxFunding: UNIT, percentages: [100], rateDen: 0 }), "InvalidRewardRate");
  });

  it("terms are immutable after activation", async () => {
    const c = await createCampaign({ mint, goal: 100 * UNIT, maxFunding: 200 * UNIT, percentages: [50, 50] });
    const newDeadline = (await chainTime()) + 60;

    // Editable while DRAFT, by the maker only.
    const stranger = await fundedKeypair();
    await expectError(
      program.methods
        .updateCampaign(new BN(90 * UNIT), new BN(200 * UNIT), new BN(newDeadline), new BN(3), new BN(1), Buffer.from([50, 50]))
        .accounts({ maker: stranger.publicKey, campaign: c.campaign })
        .signers([stranger])
        .rpc(),
      "Unauthorized"
    );
    await program.methods
      .updateCampaign(new BN(90 * UNIT), new BN(200 * UNIT), new BN(newDeadline), new BN(3), new BN(1), Buffer.from([40, 60]))
      .accounts({ maker: c.maker.publicKey, campaign: c.campaign })
      .signers([c.maker])
      .rpc();
    const edited = await program.account.campaign.fetch(c.campaign);
    assert.equal(edited.goal.toNumber(), 90 * UNIT);
    assert.equal(edited.rewardSupplyCap.toNumber(), 600 * UNIT);
    assert.deepEqual(Array.from(edited.milestonePercentages).slice(0, 2), [40, 60]);

    await activate(c);
    assert.equal(statusKey((await program.account.campaign.fetch(c.campaign)).status), "active");

    // Every term edit now fails and the stored terms are unchanged.
    await expectError(
      program.methods
        .updateCampaign(new BN(1 * UNIT), new BN(1 * UNIT), new BN(newDeadline + 100), new BN(9), new BN(1), Buffer.from([100]))
        .accounts({ maker: c.maker.publicKey, campaign: c.campaign })
        .signers([c.maker])
        .rpc(),
      "InvalidCampaignStatus"
    );
    await expectError(activate(c), "InvalidCampaignStatus");
    const after = await program.account.campaign.fetch(c.campaign);
    assert.equal(after.goal.toNumber(), 90 * UNIT);
    assert.equal(after.deadline.toNumber(), newDeadline);
    assert.equal(after.rewardRateNumerator.toNumber(), 3);
    assert.equal(after.contributionMint.toBase58(), mint.toBase58());
    assert.equal(after.maker.toBase58(), c.maker.publicKey.toBase58());
  });

  it("a rejected milestone blocks later tranches", async () => {
    const c = await createCampaign({ mint, goal: 50 * UNIT, maxFunding: 100 * UNIT, percentages: [50, 50] });
    const a = await makeContributor(c, 100);
    await activate(c);
    await contribute(c, a, 50);
    await waitUntilChainTime(c.deadline);
    await finalizeCampaign(c, a.kp);
    await claimMilestone(c, 0);
    assert.equal(await bal(c.makerAta), 25 * UNIT);

    await submitMilestone(c, 1);
    await vote(c, a, 1, false);
    await finalizeMilestone(c, a.kp, 1);
    assert.equal(statusKey((await program.account.milestone.fetch(milestonePda(c.campaign, 1))).status), "rejected");

    await expectError(claimMilestone(c, 1), "InvalidMilestoneStatus");
    await expectError(completeCampaign(c, a.kp), "MilestonesIncomplete");
    // No resubmission of the same milestone, and no refund once tranches have been released.
    await expectError(submitMilestone(c, 1, "another"), "already in use");
    await expectError(claimRefund(c, a), "InvalidCampaignStatus");
    assert.equal(await bal(c.vault), 25 * UNIT);
  });
});
