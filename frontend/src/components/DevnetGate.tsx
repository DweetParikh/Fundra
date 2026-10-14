"use client";
import { ReactNode, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { DEVNET_GENESIS_HASH, RPC_URL } from "@/lib/constants";
import Nav from "./Nav";

type State = "checking" | "ok" | "wrong" | "unreachable";

/**
 * Persistent Devnet warning plus a hard network check. The RPC endpoint's genesis hash must be
 * Devnet's; otherwise no page content renders and no transaction can be built. Because every
 * transaction is sent through this RPC, a wallet set to another network cannot move real funds here.
 */
export default function DevnetGate({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const [state, setState] = useState<State>("checking");
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    let dead = false;
    connection
      .getGenesisHash()
      .then((h) => {
        if (dead) return;
        setHash(h);
        setState(h === DEVNET_GENESIS_HASH ? "ok" : "wrong");
      })
      .catch(() => !dead && setState("unreachable"));
    return () => {
      dead = true;
    };
  }, [connection]);

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.2em] text-neutral-100">Devnet only</span>
          <span className="text-neutral-400">
            Test tokens, no real value. Set your wallet to Devnet.{" "}
            <span className="text-neutral-500">
              Network check: {state === "ok" ? "Devnet confirmed" : state === "checking" ? "checking..." : "failed"}
            </span>
          </span>
        </div>
      </div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        {state === "ok" && children}
        {state === "checking" && <p className="text-sm text-neutral-500">Verifying network...</p>}
        {state === "wrong" && (
          <div className="glass mx-auto max-w-xl p-8">
            <h1 className="text-lg font-semibold text-white">Wrong network</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Fundra runs on Solana Devnet only. The configured RPC endpoint reports a different cluster, so the app is
              disabled to protect you from sending transactions to the wrong network.
            </p>
            <p className="mt-4 break-all font-mono text-xs text-neutral-500">
              RPC: {RPC_URL}
              <br />
              Genesis hash: {hash}
              <br />
              Expected: {DEVNET_GENESIS_HASH}
            </p>
          </div>
        )}
        {state === "unreachable" && (
          <div className="glass mx-auto max-w-xl p-8">
            <h1 className="text-lg font-semibold text-white">Cannot reach the Devnet RPC</h1>
            <p className="mt-2 break-all text-sm text-neutral-400">Endpoint: {RPC_URL}</p>
          </div>
        )}
      </main>
    </>
  );
}
