// Anchor migration: runs after `anchor deploy`. Initializes the platform config once.
// Usage: anchor migrate --provider.cluster devnet
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Fundra } from "../target/types/fundra";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  const program = anchor.workspace.fundra as anchor.Program<Fundra>;

  const [platformConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    program.programId
  );

  const existing = await provider.connection.getAccountInfo(platformConfig);
  if (existing) {
    console.log("Platform already initialized:", platformConfig.toBase58());
    return;
  }

  const sig = await program.methods
    .initializePlatform()
    .accounts({
      admin: provider.wallet.publicKey,
      platformConfig,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log("Platform initialized:", platformConfig.toBase58(), sig);
};
