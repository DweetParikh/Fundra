"use client";
import type { ReactNode } from "react";
import type { CampaignView } from "@/hooks/useCampaign";
import { enumKey } from "@/lib/status";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AddressLink, Card, SectionTitle } from "./ui";

function Row({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-400">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-white text-black" : "border border-neutral-600 text-transparent"
        }`}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 5.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Each row is computed from live chain data. */
export default function SecurityChecklist({ view }: { view: CampaignView }) {
  const c = view.campaign;
  const status = enumKey(c.status);
  const auth = view.vaultAuthority;

  const vaultOk = !!view.vaultOwner && view.vaultOwner.equals(auth) && c.vault.equals(view.vault);
  const rewardOk =
    !!view.rewardMint &&
    c.rewardMint.equals(view.rewardMintPda) &&
    !!view.rewardMint.mintAuthority &&
    view.rewardMint.mintAuthority.equals(auth) &&
    view.rewardMint.freezeAuthority === null;
  const collectionOk = !!view.collectionUpdateAuthority && view.collectionUpdateAuthority.equals(auth);
  const pdaOk = vaultOk && rewardOk && collectionOk && !c.maker.equals(auth);
  const locked = status !== "draft";
  const tokenOk = !!view.contributionMint && view.contributionMint.programOwner.equals(TOKEN_PROGRAM_ID);

  return (
    <Card>
      <SectionTitle>Security checklist</SectionTitle>
      <ul className="space-y-3.5">
        <Row ok={vaultOk}>
          Contributions are held in program-controlled vault <AddressLink address={view.vault.toBase58()} />.
        </Row>
        <Row ok={pdaOk}>
          Vault, reward mint and receipt collection are all controlled by a PDA. The maker wallet holds none of them.
        </Row>
        <Row ok={locked}>
          {locked
            ? "Terms locked on campaign activation."
            : "Terms lock on activation. Until then the maker can still edit them."}
        </Row>
        <Row ok={tokenOk}>Classic SPL Token only. Token-2022 mints are rejected.</Row>
        <Row ok={!!view.contributionMint && view.contributionMint.freezeAuthority === null}>
          Token must not have a freeze authority.
        </Row>
        <Row ok>
          {status === "failed"
            ? "Target missed. Refunds are open to every contributor now."
            : "Refunds are enabled if the target is not met by the deadline."}
        </Row>
        <Row ok={rewardOk}>Reward mint is created as a program PDA.</Row>
      </ul>
    </Card>
  );
}
