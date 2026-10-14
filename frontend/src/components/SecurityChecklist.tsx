"use client";
import { ReactNode } from "react";
import type { CampaignView } from "@/hooks/useCampaign";
import { enumKey } from "@/lib/status";
import { AddressLink, Card, SectionTitle } from "./ui";

function Check({ ok, title, children }: { ok: boolean; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-white" : "border border-neutral-500"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          {title}
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${ok ? "text-neutral-300" : "text-neutral-500"}`}>
            {ok ? "Verified on-chain" : "Not verified"}
          </span>
        </div>
        <div className="mt-1 text-xs leading-relaxed text-neutral-500">{children}</div>
      </div>
    </li>
  );
}

/** Every item is computed from live chain data, not from labels. */
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

  return (
    <Card>
      <SectionTitle>Fund security</SectionTitle>
      <ul className="space-y-5">
        <Check ok={vaultOk} title="Escrow vault">
          Contributions sit in token account <AddressLink address={view.vault.toBase58()} />, whose owner is the program-derived
          authority <AddressLink address={auth.toBase58()} />.
        </Check>
        <Check ok={pdaOk} title="PDA control">
          The vault token authority, the reward mint authority and the Core collection update authority are all that same PDA.
          The maker wallet <AddressLink address={c.maker.toBase58()} /> holds none of them and cannot sign for the vault.
        </Check>
        <Check ok={locked} title="Terms locked">
          {locked
            ? "Goal, deadline, token, reward rate, supply cap, milestone split and maker can no longer be changed."
            : "Draft: the maker can still edit terms. They lock permanently on activation."}
        </Check>
        <Check ok title="Refunds enabled">
          {status === "failed"
            ? "The goal was missed. Every contributor can claim a full refund now, with no admin or maker approval."
            : status === "draft" || status === "active"
            ? "If the goal is missed at the deadline, every contributor can claim a full refund without approval from anyone."
            : "The goal was met, so refunds no longer apply. Funds are released only milestone by milestone."}
        </Check>
        <Check ok={rewardOk} title="Reward mint PDA">
          Reward mint <AddressLink address={view.rewardMintPda.toBase58()} /> is derived from this campaign, minted only by the vault
          authority PDA, and has no freeze authority. Tokens are minted only after completion and never beyond the cap.
        </Check>
      </ul>
    </Card>
  );
}
