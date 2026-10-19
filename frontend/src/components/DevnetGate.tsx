"use client";
import { ReactNode, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { DEVNET_GENESIS_HASH, RPC_URL } from "@/lib/constants";
import Nav from "./Nav";

type State = "checking" | "ok" | "wrong" | "unreachable";

/**
 * Hard network check. The RPC's genesis hash must be Devnet's, otherwise no page content renders
 * and no transaction can be built. The "Devnet only" pill is always visible in the top bar.
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
      <Nav network={state === "ok" ? "devnet" : state === "checking" ? "checking" : "error"} />
      <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-10">
        {state === "ok" && children}
        {state === "checking" && <p className="text-sm text-neutral-500">Verifying network...</p>}
        {state === "wrong" && (
          <div className="panel mx-auto max-w-xl p-8">
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
          <div className="panel mx-auto max-w-xl p-8">
            <h1 className="text-lg font-semibold text-white">Cannot reach the Devnet RPC</h1>
            <p className="mt-2 break-all text-sm text-neutral-400">Endpoint: {RPC_URL}</p>
          </div>
        )}
      </main>
    </>
  );
}
