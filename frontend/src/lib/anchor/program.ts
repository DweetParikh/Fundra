import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import idl from "./idl/fundra.json";
import type { Fundra } from "./idl/fundra";

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || (idl as { address: string }).address);

/** Used for read-only access before a wallet is connected. It cannot sign anything. */
const readOnlyWallet: Wallet = {
  publicKey: Keypair.generate().publicKey,
  payer: undefined as never,
  signTransaction: async <T extends Transaction | VersionedTransaction>(_tx: T): Promise<T> => {
    throw new Error("Connect a wallet to sign transactions");
  },
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(_txs: T[]): Promise<T[]> => {
    throw new Error("Connect a wallet to sign transactions");
  },
};

export type FundraProgram = Program<Fundra>;

export function getProgram(
  connection: Connection,
  wallet?: { publicKey: PublicKey; signTransaction: Wallet["signTransaction"]; signAllTransactions: Wallet["signAllTransactions"] }
): FundraProgram {
  const provider = new AnchorProvider(
    connection,
    (wallet as Wallet | undefined) ?? readOnlyWallet,
    { commitment: "confirmed", preflightCommitment: "confirmed" }
  );
  return new Program<Fundra>({ ...(idl as unknown as Fundra), address: PROGRAM_ID.toBase58() }, provider);
}
